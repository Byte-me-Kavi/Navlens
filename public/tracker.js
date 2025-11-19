// public/tracker.js - v3.1 (Optimized DOM Snapshot Edition)

(function () {
  // --- Configuration ---
  const SCRIPT_TAG = document.currentScript;
  if (!SCRIPT_TAG) {
    console.warn("Navlens: Cannot find current script tag.");
    return;
  }

  // Read parameters from the script tag attributes
  const SITE_ID = SCRIPT_TAG.getAttribute("data-site-id");
  const API_HOST =
    SCRIPT_TAG.getAttribute("data-api-host") || window.location.origin;

  if (!SITE_ID) {
    console.warn(
      "Navlens: Missing required attribute (data-site-id). Tracking disabled."
    );
    return;
  }

  // Generate a unique session ID for this user session
  const SESSION_ID = generateSessionId();

  const SNAPSHOT_ENDPOINT = `${API_HOST}/api/snapshot`; // New Endpoint!

  // --- Optimized Constants ---
  const THROTTLE_SCROLL_MS = 150; // Increased for better performance
  const THROTTLE_RESIZE_MS = 500; // Increased for better performance
  const CLICK_THROTTLE_MS = 100; // Increased to reduce spam
  const BATCH_SIZE = 10; // Reduced for faster sends
  const BATCH_FLUSH_INTERVAL = 8000; // Increased interval
  const SNAPSHOT_CACHE_DAYS = 1; // Cache snapshots for 1 day

  // --- Utility Functions ---
  function generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  function generateUserId() {
    let userId = localStorage.getItem("navlens_user_id");
    if (!userId) {
      userId =
        "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("navlens_user_id", userId);
    }
    return userId;
  }

  // Secure API endpoint (no sensitive data exposed)
  const API_COLLECT_ENDPOINT = `${API_HOST}/api/v1/ingest`;
  let eventQueue = [];
  let isProcessing = false;
  let flushTimer = null;
  let lastClickTime = 0;

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

    const payload = JSON.stringify({
      events: eventsToSend.map((event) => ({
        ...event,
        session_id: SESSION_ID,
        user_id: generateUserId(),
        page_url: window.location.href,
        page_path: window.location.pathname,
        user_agent: navigator.userAgent,
        timestamp: Date.now(),
      })),
      siteId: SITE_ID,
    });

    // Use sendBeacon for better reliability on page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API_COLLECT_ENDPOINT, payload);
      console.log(`✓ Sent ${eventsToSend.length} events via sendBeacon`);
      isProcessing = false;
    } else {
      // Fallback to fetch
      fetch(API_COLLECT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
        keepalive: true,
      })
        .then(() => {
          console.log(`✓ Sent ${eventsToSend.length} events to Navlens`);
        })
        .catch((error) => {
          console.error("Failed to send batched events:", error);
          if (eventQueue.length < BATCH_SIZE * 2) {
            eventQueue.unshift(...eventsToSend);
          }
        })
        .finally(() => {
          isProcessing = false;
        });
    }
  }

  function startFlushTimer() {
    if (flushTimer) clearInterval(flushTimer);
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

  // Optimized Smart Selector
  function getSmartSelector(el) {
    if (!el || el.tagName === "BODY") return "BODY";
    if (el.id) return `#${el.id}`;
    if (el.className) return `${el.tagName}.${el.className.split(" ")[0]}`;

    const parent = el.parentElement;
    if (!parent) return el.tagName;

    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(el) + 1;
    return `${getSmartSelector(parent)} > ${el.tagName}:nth-child(${index})`;
  }

  // --- Optimized DOM Snapshot Capture ---
  let rrwebLoaded = false;
  let snapshotCaptured = false;

  // Lazy load rrweb-snapshot only after page load
  function loadRrwebSnapshot() {
    if (rrwebLoaded) return;
    rrwebLoaded = true;

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/rrweb-snapshot@latest/dist/rrweb-snapshot.min.js";
    script.onload = () => {
      console.log("Navlens: rrweb-snapshot loaded");
      // Capture snapshot after a short delay to ensure DOM is stable
      setTimeout(captureSnapshot, 1000);
    };
    script.onerror = () => {
      console.warn("Navlens: Failed to load rrweb-snapshot");
    };
    document.head.appendChild(script);
  }

  function captureSnapshot() {
    if (snapshotCaptured || typeof rrwebSnapshot === "undefined") return;

    try {
      const snap = rrwebSnapshot.snapshot(document);
      snapshotCaptured = true;

      // Enhanced caching with device and viewport
      const cacheKey = `navlens_snap_${
        window.location.pathname
      }_${getDeviceType(window.innerWidth)}_${window.innerWidth}x${
        window.innerHeight
      }`;
      const lastSnap = localStorage.getItem(cacheKey);
      const CACHE_DURATION = SNAPSHOT_CACHE_DAYS * 24 * 60 * 60 * 1000;

      if (lastSnap && Date.now() - parseInt(lastSnap) < CACHE_DURATION) {
        console.log("Navlens: Snapshot already cached for this page.");
        return;
      }

      // Compress snapshot data (remove unnecessary properties)
      const compressedSnap = compressSnapshot(snap);

      const payload = {
        site_id: SITE_ID,
        page_path: window.location.pathname,
        device_type: getDeviceType(window.innerWidth),
        snapshot: compressedSnap,
        width: window.innerWidth,
        height: window.innerHeight,
        timestamp: Date.now(),
      };

      // Use sendBeacon for large payloads
      const payloadStr = JSON.stringify(payload);
      if (navigator.sendBeacon && payloadStr.length < 64000) {
        // sendBeacon limit
        navigator.sendBeacon(SNAPSHOT_ENDPOINT, payloadStr);
        localStorage.setItem(cacheKey, Date.now().toString());
        console.log("Navlens: DOM Snapshot sent via sendBeacon");
      } else {
        fetch(SNAPSHOT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payloadStr,
        })
          .then((res) => {
            if (res.ok) {
              localStorage.setItem(cacheKey, Date.now().toString());
              console.log("Navlens: DOM Snapshot uploaded successfully.");
            }
          })
          .catch(() => {
            console.warn("Navlens: Failed to upload DOM snapshot");
          });
      }
    } catch (error) {
      console.warn("Navlens: Error capturing snapshot:", error);
    }
  }

  // Compress snapshot by removing redundant data
  function compressSnapshot(snap) {
    // Remove style attributes that are not needed for heatmaps
    function cleanNode(node) {
      if (node.attributes) {
        delete node.attributes.style;
        delete node.attributes.class; // Keep classes for selectors
      }
      if (node.childNodes) {
        node.childNodes.forEach(cleanNode);
      }
    }
    cleanNode(snap);
    return snap;
  }

  // --- Core Event Creation Function ---
  function createEvent(eventType, payload = {}) {
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    return {
      site_id: SITE_ID,
      event_type: eventType,
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
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
      ...payload,
    };
  }

  // --- Optimized Event Listeners ---

  // Page View Event - delayed to avoid blocking
  function handlePageView() {
    setTimeout(() => {
      addEventToQueue(
        createEvent("page_view", {
          load_time: performance.now(),
        })
      );
      // Start loading rrweb after page load
      loadRrwebSnapshot();
    }, 100);
  }
  window.addEventListener("load", handlePageView);

  // Click Event with improved throttling
  function handleClick(event) {
    const now = Date.now();
    if (now - lastClickTime < CLICK_THROTTLE_MS) return;
    lastClickTime = now;

    const target = event.target;
    const docWidth = document.documentElement.scrollWidth;
    const docHeight = document.documentElement.scrollHeight;

    addEventToQueue(
      createEvent("click", {
        x: event.pageX,
        y: event.pageY,
        x_relative: event.pageX / docWidth,
        y_relative: event.pageY / docHeight,
        element_id: target.id || "",
        element_classes: Array.from(target.classList).join(" ") || "",
        element_tag: target.tagName,
        element_text: target.textContent
          ? target.textContent.trim().substring(0, 100)
          : "",
        element_selector: getSmartSelector(target),
      })
    );
  }
  document.addEventListener("click", handleClick, { passive: true });

  // Scroll Event with passive listener
  let lastScrollTime = 0;
  function handleScroll() {
    const now = Date.now();
    if (now - lastScrollTime < THROTTLE_SCROLL_MS) return;
    lastScrollTime = now;

    const currentScrollY = window.scrollY;
    const documentHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const scrollDepth =
      documentHeight > 0
        ? Math.min(1, Math.max(0, currentScrollY / documentHeight))
        : 0;

    addEventToQueue(
      createEvent("scroll", {
        x: window.scrollX,
        y: window.scrollY,
        scroll_depth: scrollDepth,
      })
    );
  }
  window.addEventListener("scroll", handleScroll, { passive: true });

  // Resize Event
  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      addEventToQueue(
        createEvent("viewport_resize", {
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
        })
      );
    }, THROTTLE_RESIZE_MS);
  }
  window.addEventListener("resize", handleResize);

  // Cleanup on unload
  window.addEventListener("beforeunload", () => {
    flushEventQueue();
    if (flushTimer) clearInterval(flushTimer);
  });

  // Start the flush timer
  startFlushTimer();

  // Expose trackEvent globally
  window.trackEvent = function (eventType, payload) {
    addEventToQueue(createEvent(eventType, payload));
  };
})();
