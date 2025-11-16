// public/tracker.js

(function () {
  // --- Configuration ---
  const API_COLLECT_ENDPOINT = "/api/collect"; // Your Next.js API route
  const SITE_ID = "a2a95f61-1024-40f8-af7e-4c4df2fcbd01"; // IMPORTANT: Change this to a unique ID for your website
  const THROTTLE_SCROLL_MS = 100; // How often to send scroll events (ms)
  const THROTTLE_RESIZE_MS = 300; // How often to send resize events (ms)

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

  // --- Core Event Sending Function ---
  async function sendEvent(eventType, payload = {}) {
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
      // Add any other common fields
    };

    const fullEvent = { ...baseEvent, ...payload };

    try {
      // Use navigator.sendBeacon for page unloads if available, more reliable for analytics
      if (
        navigator.sendBeacon &&
        (eventType === "page_unload" || eventType === "session_end")
      ) {
        navigator.sendBeacon(API_COLLECT_ENDPOINT, JSON.stringify(fullEvent));
      } else {
        await fetch(API_COLLECT_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fullEvent),
          keepalive: true, // Helps send events even if page is about to unload
        });
      }
    } catch (error) {
      console.error("Failed to send event:", error);
    }
  }

  // --- Event Listeners ---

  // Page View / Load Event
  function handlePageView() {
    sendEvent("page_view", {
      load_time: performance.now(), // Time until page is interactive
    });
  }
  window.addEventListener("load", handlePageView);

  // Click Event
  function handleClick(event) {
    const target = event.target;
    sendEvent("click", {
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
        : "", // Trim long text
      element_selector: getElementSelector(target),
    });
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

    sendEvent("scroll", {
      x: window.scrollX,
      y: window.scrollY,
      scroll_depth: Math.min(1, Math.max(0, scrollDepth)), // Ensure 0-1 range
    });
    lastScrollY = currentScrollY;
  }
  window.addEventListener("scroll", handleScroll);

  // Resize Event (Throttled)
  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      sendEvent("viewport_resize", {
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
      });
    }, THROTTLE_RESIZE_MS);
  }
  window.addEventListener("resize", handleResize);

  // Optional: Expose sendEvent globally for custom events
  window.trackEvent = sendEvent;
})();
