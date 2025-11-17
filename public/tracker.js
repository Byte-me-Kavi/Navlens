// public/tracker.js

(function () {
  // --- Configuration ---
  const SCRIPT_TAG = document.currentScript;
  if (!SCRIPT_TAG) {
    console.warn("Navlens: Cannot find current script tag.");
    return;
  }

  // Read parameters from the script tag attributes
  const SITE_ID = SCRIPT_TAG.getAttribute("data-site-id");
  const API_KEY = SCRIPT_TAG.getAttribute("data-api-key");
  const API_HOST = SCRIPT_TAG.getAttribute("data-api-host");

  if (!SITE_ID || !API_KEY || !API_HOST) {
    console.warn(
      "Navlens: Missing required attributes (data-site-id, data-api-key, or data-api-host). Tracking disabled."
    );
    return;
  }

  const API_COLLECT_ENDPOINT = `${API_HOST}/api/collect`;
  const THROTTLE_SCROLL_MS = 100; // How often to send scroll events (ms)
  const THROTTLE_RESIZE_MS = 300; // How often to send resize events (ms)
  const CLICK_THROTTLE_MS = 50; // Ignore successive clicks faster than 50ms (prevents rage-click spam)
  const BATCH_SIZE = 15; // Send events when queue reaches this size
  const BATCH_FLUSH_INTERVAL = 5000; // Send queued events every 5 seconds

  // --- Event Queue ---
  let eventQueue = [];
  let isProcessing = false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let flushTimer = null;
  let lastClickTime = 0; // Track last click time for throttling

  function addEventToQueue(event) {
    eventQueue.push(event);
    if (eventQueue.length >= BATCH_SIZE) {
      flushEventQueue();
    }
  }

  function flushEventQueue() {
    if (eventQueue.length === 0 || isProcessing) return;

    isProcessing = true;
    const eventsToSend = [...eventQueue];
    eventQueue = [];

    const payload = JSON.stringify({ events: eventsToSend, api_key: API_KEY });

    // Try using fetch with keepalive for best reliability
    fetch(API_COLLECT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
      keepalive: true, // Ensures request completes even if page unloads
    })
      .then(() => {
        console.log(`✓ Sent ${eventsToSend.length} events to Navlens`);
      })
      .catch((error) => {
        console.error("Failed to send batched events:", error);
        // Re-add events on failure if queue isn't too large
        if (eventQueue.length < BATCH_SIZE * 2) {
          eventQueue.unshift(...eventsToSend);
        }
      })
      .finally(() => {
        isProcessing = false;
      });
  }

  function startFlushTimer() {
    flushTimer = setInterval(() => {
      if (eventQueue.length > 0) {
        flushEventQueue();
      }
    }, BATCH_FLUSH_INTERVAL);
  }

  // --- Helper Functions ---
  function getClientId() {
    let clientId = localStorage.getItem("client_id");
    if (!clientId) {
      clientId =
        "client-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("client_id", clientId);
    }
    return clientId;
  }

  function getSessionId() {
    // A simple session ID, resets on page refresh/new session if no existing session in sessionStorage
    let sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      sessionId =
        "session-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("session_id", sessionId);
    }
    return sessionId;
  }

  function getDeviceType(viewportWidth) {
    if (viewportWidth < 768) return "mobile";
    if (viewportWidth < 1024) return "tablet";
    return "desktop";
  }

  function getElementSelector(el) {
    if (!el || el === document.body) return "body";
    const id = el.getAttribute("id");
    if (id) return `#${id}`;
    const classes = Array.from(el.classList)
      .filter((c) => c.length > 0)
      .map((c) => `.${c}`)
      .join("");
    const tag = el.tagName.toLowerCase();
    return tag + classes;
  }

  // NEW: Smart Selector that matches Puppeteer Scraper's logic
  function getSmartSelector(el) {
    if (!el || el.tagName === "BODY") return "BODY";
    // If it has an ID, use it (fastest)
    if (el.id) return `#${el.id}`;

    // Otherwise generate path
    const parent = el.parentElement;
    if (!parent) return el.tagName;

    const children = Array.from(parent.children);
    const index = children.indexOf(el) + 1;

    return `${getSmartSelector(parent)} > ${el.tagName}:nth-child(${index})`;
  }

  // --- Core Event Creation Function (no longer sends immediately) ---
  function createEvent(eventType, payload = {}) {
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    const baseEvent = {
      site_id: SITE_ID,
      event_type: eventType,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "), // YYYY-MM-DD HH:MM:SS format
      page_url: window.location.href,
      page_path: window.location.pathname,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      user_language: navigator.language,
      viewport_width: viewportWidth,
      viewport_height: viewportHeight,
      screen_width: screen.width,
      screen_height: screen.height,
      device_type: getDeviceType(viewportWidth),
      session_id: getSessionId(),
      client_id: getClientId(),
    };

    return { ...baseEvent, ...payload };
  }

  // --- Event Listeners ---

  // Page View / Load Event
  function handlePageView() {
    const event = createEvent("page_view", {
      load_time: performance.now(),
    });
    addEventToQueue(event);
  }
  window.addEventListener("load", handlePageView);

  // Click Event
  function handleClick(event) {
    const now = Date.now();
    if (now - lastClickTime < CLICK_THROTTLE_MS) {
      return; // Ignore rapid successive clicks
    }
    lastClickTime = now;

    const target = event.target;
    const clickEvent = createEvent("click", {
      x: event.clientX,
      y: event.clientY,
      x_relative:
        event.clientX /
        (document.documentElement.clientWidth || window.innerWidth),
      y_relative:
        event.clientY /
        (document.documentElement.clientHeight || window.innerHeight),
      element_id: target.id || "",
      element_classes: Array.from(target.classList || []).join(" ") || "",
      element_tag: target.tagName || "",
      element_text: target.textContent
        ? target.textContent.trim().substring(0, 255)
        : "",
      smart_selector: getSmartSelector(target), // NEW: Smart selector that matches Puppeteer scraper
    });
    addEventToQueue(clickEvent);
  }
  document.addEventListener("click", handleClick);

  // Scroll Event (Throttled)
  let lastScrollTime = 0;
  function handleScroll() {
    const now = Date.now();
    if (now - lastScrollTime < THROTTLE_SCROLL_MS) {
      return;
    }
    lastScrollTime = now;

    const currentScrollY = window.scrollY;
    const documentHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    let scrollDepth = 0;
    if (documentHeight > 0) {
      scrollDepth = currentScrollY / documentHeight;
    }

    const scrollEvent = createEvent("scroll", {
      x: window.scrollX,
      y: window.scrollY,
      scroll_depth: Math.min(1, Math.max(0, scrollDepth)),
    });
    addEventToQueue(scrollEvent);
  }
  window.addEventListener("scroll", handleScroll);

  // Resize Event (Throttled)
  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const resizeEvent = createEvent("viewport_resize", {
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
      });
      addEventToQueue(resizeEvent);
    }, THROTTLE_RESIZE_MS);
  }
  window.addEventListener("resize", handleResize);

  // On page unload, flush any remaining events
  window.addEventListener("beforeunload", () => {
    flushEventQueue();
  });

  // Start the flush timer on initialization
  startFlushTimer();

  // Expose trackEvent globally for custom events
  window.trackEvent = function (eventType, payload) {
    const event = createEvent(eventType, payload);
    addEventToQueue(event);
  };
})();
