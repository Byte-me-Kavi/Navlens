// public/tracker.js - v3.2 (Enhanced rrweb Events with Rich Metadata)

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

  const RRWEB_EVENTS_ENDPOINT = `${API_HOST}/api/rrweb-events`; // rrweb events endpoint
  const SNAPSHOT_ENDPOINT = `${API_HOST}/api/dom-snapshot`; // DOM snapshot endpoint

  // --- rrweb Recording Setup ---
  let rrwebStopRecording = null;
  const recordedEvents = [];
  const RRWEB_BATCH_SIZE = 50; // Send rrweb events in batches

  // --- Event Batching Constants ---
  const BATCH_SIZE = 10; // Send regular events in batches of 10
  const BATCH_FLUSH_INTERVAL = 5000; // Flush batch every 5 seconds

  // --- Throttling Constants ---
  const CLICK_THROTTLE_MS = 100; // Throttle clicks to 100ms
  const THROTTLE_SCROLL_MS = 150; // Throttle scroll events to 150ms
  const THROTTLE_RESIZE_MS = 200; // Throttle resize events to 200ms

  // --- Caching Constants ---
  const SNAPSHOT_CACHE_DAYS = 7; // Cache snapshots for 7 days

  // Performance metrics
  let domReadyTime = null;
  let loadTime = null;

  // Capture DOM ready time
  document.addEventListener("DOMContentLoaded", () => {
    domReadyTime = performance.now();
  });

  // Capture load time
  window.addEventListener("load", () => {
    loadTime = performance.now();
  });

  // --- 1. Helper: Generate/Get Persistent Visitor ID ---
  function getVisitorId() {
    let vid = localStorage.getItem("navlens_vid");
    if (!vid) {
      vid = "v-" + Math.random().toString(36).substr(2, 9) + "-" + Date.now();
      localStorage.setItem("navlens_vid", vid);
    }
    return vid;
  }

  // --- 2. Helper: Get Session ID ---
  function getSessionId() {
    let sid = sessionStorage.getItem("navlens_sid");
    if (!sid) {
      sid = "s-" + Math.random().toString(36).substr(2, 9) + "-" + Date.now();
      sessionStorage.setItem("navlens_sid", sid);
    }
    return sid;
  }

  function startRrwebRecording() {
    if (typeof rrweb === "undefined" || typeof rrweb.record === "undefined") {
      console.warn("rrweb not available for recording");
      return;
    }

    console.log("Starting rrweb recording for mouse and scroll events");

    rrwebStopRecording = rrweb.record({
      emit(event) {
        // Store events
        recordedEvents.push(event);

        // Send in batches for mouse/scroll events
        if (recordedEvents.length >= RRWEB_BATCH_SIZE) {
          sendRrwebEvents();
        }
      },
      // Record mouse movements and scroll events
      recordMouseMovement: true,
      recordScroll: true,
      // Don't record canvas or other heavy elements
      recordCanvas: false,
      recordWebGL: false,
      // Sampling for performance
      sampling: {
        mouseMove: 10, // Only record every 10th mouse movement
        scroll: 150, // Throttle scroll events
      },
    });
  }

  function stopRrwebRecording() {
    if (rrwebStopRecording) {
      rrwebStopRecording();
      rrwebStopRecording = null;
      // Send any remaining events
      if (recordedEvents.length > 0) {
        sendRrwebEvents();
      }
      console.log("Stopped rrweb recording");
    }
  }

  function sendRrwebEvents() {
    if (recordedEvents.length === 0) return;

    const eventsToSend = [...recordedEvents];
    recordedEvents.length = 0; // Clear the array

    // Detect device type
    const width = window.innerWidth;
    const deviceType =
      width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";

    // Prepare the payload matching the Database Schema with rich metadata
    const payload = {
      site_id: SITE_ID,
      page_path: window.location.pathname,
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      events: eventsToSend, // The raw rrweb JSON
      timestamp: new Date().toISOString(), // Current time

      // Browser/Device Metadata
      user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      device_pixel_ratio: window.devicePixelRatio || 1,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer,
      platform: navigator.platform,
      cookie_enabled: navigator.cookieEnabled,
      online: navigator.onLine,
      device_type: deviceType,

      // Performance Metrics
      load_time: loadTime > 0 ? loadTime : null,
      dom_ready_time: domReadyTime > 0 ? domReadyTime : null,
    };

    // Use fetch with keepalive for proper JSON handling
    fetch(RRWEB_EVENTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((res) => {
        if (res.ok) {
          console.log(
            `✓ Sent ${eventsToSend.length} rrweb events successfully`
          );
        } else {
          console.error(`Failed to send rrweb events - HTTP ${res.status}`);
          recordedEvents.unshift(...eventsToSend);
        }
      })
      .catch((error) => {
        console.error("Failed to send rrweb events:", error);
        // Re-queue events on failure
        recordedEvents.unshift(...eventsToSend);
      });
  }

  // --- Utility Functions ---
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
  let lastScrollTime = 0;

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
        type: event.event_type, // Rename event_type to type
        timestamp: event.timestamp,
        session_id: event.session_id,
        user_id: generateUserId(),
        page_url: event.page_url,
        page_path: event.page_path,
        user_agent: event.user_agent,
        // Additional fields for context (stored in data object)
        data: {
          viewport_width: event.viewport_width,
          viewport_height: event.viewport_height,
          screen_width: event.screen_width,
          screen_height: event.screen_height,
          device_type: event.device_type,
          x: event.x,
          y: event.y,
          x_relative: event.x_relative,
          y_relative: event.y_relative,
          element_id: event.element_id,
          element_classes: event.element_classes,
          element_tag: event.element_tag,
          element_text: event.element_text,
          element_selector: event.element_selector,
          scroll_depth: event.scroll_depth,
        },
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

  // Lazy load rrweb-snapshot only after page load
  function loadRrwebSnapshot() {
    if (rrwebLoaded) return;
    rrwebLoaded = true;

    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/rrweb-snapshot@latest/dist/rrweb-snapshot.min.js";
    script.onload = () => {
      console.log("Navlens: rrweb-snapshot loaded");
      // Capture snapshots for all device types
      setTimeout(() => captureSnapshotsForAllDevices(), 1000);
    };
    script.onerror = () => {
      console.warn("Navlens: Failed to load rrweb-snapshot");
    };
    document.head.appendChild(script);
  }

  function captureSnapshotForDevice(deviceType) {
    if (typeof rrwebSnapshot === "undefined") return;

    try {
      const snap = rrwebSnapshot.snapshot(document);

      // Enhanced caching with device type
      const cacheKey = `navlens_snap_${window.location.pathname}_${deviceType}`;
      const lastSnap = localStorage.getItem(cacheKey);
      const CACHE_DURATION = SNAPSHOT_CACHE_DAYS * 24 * 60 * 60 * 1000;

      const isCached =
        lastSnap && Date.now() - parseInt(lastSnap) < CACHE_DURATION;
      if (isCached) {
        console.log(`Navlens: Snapshot already cached for ${deviceType}`);
        return;
      }

      // Compress snapshot data (remove unnecessary properties)
      const compressedSnap = compressSnapshot(snap);

      const payload = {
        site_id: SITE_ID,
        page_path: window.location.pathname,
        device_type: deviceType,
        snapshot: compressedSnap,
        width:
          deviceType === "desktop" ? 1440 : deviceType === "tablet" ? 768 : 375,
        height:
          deviceType === "desktop" ? 900 : deviceType === "tablet" ? 1024 : 667,
        timestamp: Date.now(),
      };

      // Use fetch with proper JSON content type (sendBeacon doesn't support application/json)
      const payloadStr = JSON.stringify(payload);
      console.log(
        `Navlens: Uploading snapshot for ${deviceType}, size: ${payloadStr.length} bytes`
      );
      fetch(SNAPSHOT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payloadStr,
        // keepalive: true, // Removed to avoid issues
      })
        .then((res) => {
          if (res.ok) {
            localStorage.setItem(cacheKey, Date.now().toString());
            console.log(
              `Navlens: DOM Snapshot uploaded successfully for ${deviceType}`
            );
          } else {
            console.error(
              `Navlens: Failed to upload snapshot - HTTP ${res.status}`
            );
          }
        })
        .catch((err) => {
          console.error(
            `Navlens: Failed to upload DOM snapshot for ${deviceType}:`,
            err
          );
        });
    } catch (error) {
      console.warn(
        `Navlens: Error capturing snapshot for ${deviceType}:`,
        error
      );
    }
  }

  // Capture snapshots for all device types
  function captureSnapshotsForAllDevices() {
    const devices = ["desktop"]; // Only desktop for now
    devices.forEach((device, index) => {
      setTimeout(() => captureSnapshotForDevice(device), index * 500); // Stagger captures
    });
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
      timestamp: Date.now(), // Numeric timestamp in milliseconds
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

  // Start rrweb recording for mouse and scroll events
  startRrwebRecording();

  // Cleanup on unload
  window.addEventListener("beforeunload", () => {
    stopRrwebRecording();
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
