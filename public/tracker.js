// public/tracker.js - v4.0 (Advanced Session Intelligence)

(function () {
  // --- Configuration ---
  const SCRIPT_TAG = document.currentScript;
  if (!SCRIPT_TAG) {
    console.warn("Navlens: Cannot find current script tag.");
    return;
  }

  // Read parameters from the script tag attributes
  const SITE_ID = SCRIPT_TAG.getAttribute("data-site-id");
  // NOTE: API keys are NOT sent from client-side for security
  // Server validates requests using site_id + Origin header
  const API_HOST =
    SCRIPT_TAG.getAttribute("data-api-host") ||
    (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000"
      : "https://navlens-rho.vercel.app");

  if (!SITE_ID) {
    console.warn(
      "Navlens: Missing required attribute (data-site-id). Tracking disabled."
    );
    return;
  }

  const RRWEB_EVENTS_ENDPOINT = `${API_HOST}/api/rrweb-events`; // rrweb events endpoint
  const SNAPSHOT_ENDPOINT = `${API_HOST}/api/dom-snapshot`; // DOM snapshot endpoint

  console.log("Navlens Tracker Config:", {
    SITE_ID,
    API_HOST,
    RRWEB_EVENTS_ENDPOINT,
    currentOrigin: window.location.origin,
  });

  // --- rrweb Recording Setup ---
  let rrwebStopRecording = null;
  const recordedEvents = [];
  const RRWEB_BATCH_SIZE = 50; // Send rrweb events in batches

  // ===========================================
  // ADVANCED SESSION INTELLIGENCE
  // ===========================================

  // Session signals storage
  const sessionSignals = [];

  // --- Rage Click Detection ---
  const RAGE_CLICK_THRESHOLD = 3; // 3+ clicks = rage
  const RAGE_CLICK_WINDOW = 1000; // within 1 second
  const RAGE_CLICK_RADIUS = 30; // pixels proximity
  let clickHistory = [];

  function detectRageClick(x, y, element) {
    const now = Date.now();
    clickHistory.push({ x, y, time: now, element });

    // Remove old clicks outside window
    clickHistory = clickHistory.filter((c) => now - c.time < RAGE_CLICK_WINDOW);

    // Check for rage clicks in same area
    const nearbyClicks = clickHistory.filter(
      (c) =>
        Math.abs(c.x - x) < RAGE_CLICK_RADIUS &&
        Math.abs(c.y - y) < RAGE_CLICK_RADIUS
    );

    if (nearbyClicks.length >= RAGE_CLICK_THRESHOLD) {
      const signal = {
        type: "rage_click",
        timestamp: new Date().toISOString(),
        data: {
          x,
          y,
          click_count: nearbyClicks.length,
          element_selector: getElementSelector(element),
          element_text: (element.textContent || "").substring(0, 100),
        },
      };
      sessionSignals.push(signal);
      console.log("🔴 Rage click detected:", signal);
      // Reset to avoid duplicate detections
      clickHistory = [];
    }
  }

  // --- Dead Click Detection ---
  function detectDeadClick(element, event) {
    // Check if element or parents have click handlers
    const hasClickHandler = (el) => {
      if (!el || el === document.body) return false;

      // Check for onclick attribute
      if (el.onclick || el.getAttribute("onclick")) return true;

      // Check for interactive elements
      const interactiveTags = [
        "A",
        "BUTTON",
        "INPUT",
        "SELECT",
        "TEXTAREA",
        "LABEL",
      ];
      if (interactiveTags.includes(el.tagName)) return true;

      // Check for role attributes
      const role = el.getAttribute("role");
      if (
        role &&
        ["button", "link", "checkbox", "menuitem", "tab"].includes(role)
      )
        return true;

      // Check for cursor pointer (indicates clickable)
      try {
        const style = window.getComputedStyle(el);
        if (style.cursor === "pointer") return true;
      } catch (e) {
        // Ignore style errors
      }

      // Check parent
      return hasClickHandler(el.parentElement);
    };

    // Check if it looks clickable but isn't - more lenient detection
    const looksClickable = (el) => {
      try {
        const style = window.getComputedStyle(el);
        const tagName = el.tagName.toLowerCase();
        const classes = el.className || "";

        // Check common button-like classes
        const buttonClasses = [
          "btn",
          "button",
          "cta",
          "action",
          "submit",
          "card",
          "clickable",
        ];
        const hasButtonClass = buttonClasses.some(
          (cls) =>
            typeof classes === "string" && classes.toLowerCase().includes(cls)
        );

        // Check for visual indicators
        const hasPointerCursor = style.cursor === "pointer";
        const hasBackground =
          style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
          style.backgroundColor !== "transparent";
        const hasBorderRadius = style.borderRadius !== "0px";
        const hasBorder =
          style.border &&
          style.border !== "none" &&
          style.borderWidth !== "0px";
        const hasBoxShadow = style.boxShadow && style.boxShadow !== "none";

        // Element looks like a card or clickable container
        const looksLikeCard =
          hasBackground && (hasBorderRadius || hasBoxShadow);

        // Images and divs with pointer events
        const isVisualElement = ["img", "svg", "div", "span", "li"].includes(
          tagName
        );

        return (
          hasButtonClass ||
          hasPointerCursor ||
          (isVisualElement && looksLikeCard)
        );
      } catch (e) {
        return false;
      }
    };

    // Delay check to see if navigation or state change occurred
    const urlBefore = window.location.href;
    setTimeout(() => {
      const urlAfter = window.location.href;
      const urlChanged = urlBefore !== urlAfter;

      const isHandler = hasClickHandler(element);
      const looksClick = looksClickable(element);

      // Debug logging
      console.log("Navlens: Dead click check:", {
        element: element.tagName,
        hasHandler: isHandler,
        looksClickable: looksClick,
        urlChanged: urlChanged,
      });

      if (!urlChanged && !isHandler && looksClick) {
        const signal = {
          type: "dead_click",
          timestamp: new Date().toISOString(),
          data: {
            x: event.clientX,
            y: event.clientY,
            element_selector: getElementSelector(element),
            element_tag: element.tagName,
            element_text: (element.textContent || "").substring(0, 100),
          },
        };
        sessionSignals.push(signal);
        console.log("⚫ Dead click detected:", signal);
      }
    }, 100);
  }

  // --- U-Turn Detection ---
  const pageLoadTime = Date.now();
  let hasDetectedUTurn = false;

  window.addEventListener("popstate", () => {
    console.log("Navlens: popstate detected, checking for U-turn");
    if (hasDetectedUTurn) return;

    const timeOnPage = Date.now() - pageLoadTime;
    console.log("Navlens: Time on page:", timeOnPage, "ms");

    if (timeOnPage < 3000) {
      // Left within 3 seconds
      hasDetectedUTurn = true;
      const signal = {
        type: "u_turn",
        timestamp: new Date().toISOString(),
        data: {
          time_on_page_ms: timeOnPage,
          from_url: window.location.href,
          referrer: document.referrer,
        },
      };
      sessionSignals.push(signal);
      console.log("↩️ U-turn detected:", signal);
    }
  });

  // Also detect back button via beforeunload for quick exits
  let isNavigatingAway = false;
  window.addEventListener("beforeunload", () => {
    isNavigatingAway = true;
    const timeOnPage = Date.now() - pageLoadTime;
    console.log("Navlens: beforeunload - time on page:", timeOnPage, "ms");

    if (timeOnPage < 2000 && !hasDetectedUTurn) {
      const signal = {
        type: "quick_exit",
        timestamp: new Date().toISOString(),
        data: {
          time_on_page_ms: timeOnPage,
          page_url: window.location.href,
        },
      };
      sessionSignals.push(signal);
      console.log("🟡 Quick exit detected:", signal);
      // Send immediately before page unloads
      sendRrwebEvents();
    }
  });

  // --- Console Error Capture ---
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const capturedConsoleLogs = [];
  const MAX_CONSOLE_LOGS = 50;

  console.error = function (...args) {
    captureConsoleLog("error", args);
    originalConsoleError.apply(console, args);
  };

  console.warn = function (...args) {
    captureConsoleLog("warn", args);
    originalConsoleWarn.apply(console, args);
  };

  function captureConsoleLog(level, args) {
    if (capturedConsoleLogs.length >= MAX_CONSOLE_LOGS) return;

    // Skip our own logs
    const message = args
      .map((a) =>
        typeof a === "object" ? JSON.stringify(a).substring(0, 500) : String(a)
      )
      .join(" ");

    if (message.includes("Navlens") || message.includes("rrweb")) return;

    const logEntry = {
      type: "console",
      timestamp: new Date().toISOString(),
      data: {
        level,
        message: message.substring(0, 1000),
        url: window.location.href,
      },
    };

    capturedConsoleLogs.push(logEntry);

    // Add to signals if it's an error
    if (level === "error") {
      sessionSignals.push({
        type: "console_error",
        timestamp: logEntry.timestamp,
        data: logEntry.data,
      });
      console.log = originalConsoleError; // Temporarily restore
      console.log("🔴 Console error captured");
      console.error = function (...args) {
        captureConsoleLog("error", args);
        originalConsoleError.apply(console, args);
      };
    }
  }

  // --- JavaScript Error Capture ---
  window.addEventListener("error", (event) => {
    const signal = {
      type: "js_error",
      timestamp: new Date().toISOString(),
      data: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack?.substring(0, 1000) || "",
      },
    };
    sessionSignals.push(signal);
    // Use originalConsoleError to avoid capturing our own log
    originalConsoleError.call(
      console,
      "❌ Navlens: JS error captured:",
      signal
    );
  });

  // --- Unhandled Promise Rejection Capture ---
  window.addEventListener("unhandledrejection", (event) => {
    const signal = {
      type: "unhandled_rejection",
      timestamp: new Date().toISOString(),
      data: {
        reason: String(event.reason).substring(0, 1000),
        stack: event.reason?.stack?.substring(0, 1000) || "",
      },
    };
    sessionSignals.push(signal);
    originalConsoleError.call(
      console,
      "❌ Navlens: Unhandled rejection captured:",
      signal
    );
  });

  // --- Debug: Expose signals for testing ---
  window.__navlensSignals = function () {
    console.log("📊 Navlens Session Signals:", sessionSignals);
    console.log("📋 Navlens Console Logs:", capturedConsoleLogs);
    return { sessionSignals, capturedConsoleLogs };
  };

  // Log signals count periodically (every 10 seconds)
  setInterval(() => {
    if (sessionSignals.length > 0 || capturedConsoleLogs.length > 0) {
      console.log(
        `📊 Navlens: ${sessionSignals.length} signals, ${capturedConsoleLogs.length} console logs captured`
      );
    }
  }, 10000);

  // --- Helper: Get CSS Selector for Element ---
  function getElementSelector(el) {
    if (!el || el === document.body) return "body";

    const parts = [];
    while (el && el !== document.body && parts.length < 5) {
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        selector += "#" + el.id;
        parts.unshift(selector);
        break;
      }
      if (el.className && typeof el.className === "string") {
        const classes = el.className.trim().split(/\s+/).slice(0, 2).join(".");
        if (classes) selector += "." + classes;
      }
      parts.unshift(selector);
      el = el.parentElement;
    }
    return parts.join(" > ");
  }

  // --- Enhanced Click Handler for Signal Detection ---
  document.addEventListener(
    "click",
    (event) => {
      const element = event.target;
      detectRageClick(event.clientX, event.clientY, element);
      detectDeadClick(element, event);
    },
    true
  );

  // ===========================================
  // END SESSION INTELLIGENCE
  // ===========================================

  // Load rrweb library dynamically
  function loadRrweb() {
    return new Promise((resolve, reject) => {
      if (typeof rrweb !== "undefined") {
        resolve(rrweb);
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/rrweb@2.0.0-alpha.11/dist/rrweb.min.js";
      script.onload = () => {
        console.log("rrweb library loaded successfully");
        resolve(rrweb);
      };
      script.onerror = () => {
        console.warn("Failed to load rrweb library");
        reject(new Error("Failed to load rrweb"));
      };
      document.head.appendChild(script);
    });
  }

  // --- Event Batching Constants ---
  const BATCH_SIZE = 10; // Send regular events in batches of 10
  const BATCH_FLUSH_INTERVAL = 5000; // Flush batch every 5 seconds

  // --- Throttling Constants ---
  const CLICK_THROTTLE_MS = 100; // Throttle clicks to 100ms
  const THROTTLE_SCROLL_MS = 150; // Throttle scroll events to 150ms
  const THROTTLE_RESIZE_MS = 200; // Throttle resize events to 200ms

  // --- Caching Constants ---

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
    loadRrweb()
      .then(() => {
        if (
          typeof rrweb === "undefined" ||
          typeof rrweb.record === "undefined"
        ) {
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
      })
      .catch((error) => {
        console.warn("Failed to start rrweb recording:", error);
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
    if (recordedEvents.length === 0 && sessionSignals.length === 0) return;

    const eventsToSend = [...recordedEvents];
    recordedEvents.length = 0; // Clear the array

    // Collect signals to send (include console logs)
    const signalsToSend = [...sessionSignals, ...capturedConsoleLogs];

    // Detect device type
    const width = window.innerWidth;
    const deviceType =
      width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";

    // Prepare the payload matching the Database Schema with rich metadata
    const payload = {
      site_id: SITE_ID,
      // NOTE: No API key sent - server validates via site_id + Origin header
      page_path: window.location.pathname,
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      events: eventsToSend, // The raw rrweb JSON
      timestamp: new Date().toISOString(), // Current time

      // Session Intelligence Signals
      session_signals: signalsToSend,

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
    console.log(
      `Sending ${eventsToSend.length} rrweb events to:`,
      RRWEB_EVENTS_ENDPOINT
    );
    console.log(
      "Payload site_id:",
      payload.site_id,
      "events count:",
      payload.events.length,
      "signals count:",
      signalsToSend.length
    );

    // Log what signals are being sent
    if (signalsToSend.length > 0) {
      console.log(
        "📤 Sending session signals:",
        signalsToSend.map((s) => s.type)
      );
    }

    fetch(RRWEB_EVENTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Removed keepalive: true to allow proper CORS preflight handling
    })
      .then((res) => {
        console.log("rrweb API response status:", res.status);
        if (res.ok) {
          return res.json().then((data) => {
            console.log(
              `✓ Sent ${eventsToSend.length} rrweb events successfully`,
              data
            );
          });
        } else {
          return res.text().then((text) => {
            console.error(
              `Failed to send rrweb events - HTTP ${res.status}:`,
              text
            );
            recordedEvents.unshift(...eventsToSend);
          });
        }
      })
      .catch((error) => {
        console.error("Failed to send rrweb events:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          endpoint: RRWEB_EVENTS_ENDPOINT,
        });
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
        referrer: event.referrer,
        user_agent: event.user_agent,
        user_language: event.user_language,
        viewport_width: event.viewport_width,
        viewport_height: event.viewport_height,
        screen_width: event.screen_width,
        screen_height: event.screen_height,
        device_type: event.device_type,
        client_id: event.client_id,
        load_time: event.load_time,
        // Additional fields for context (stored in data object)
        data: {
          x: event.x,
          y: event.y,
          x_relative: event.x_relative,
          y_relative: event.y_relative,
          scroll_depth: event.scroll_depth,
          document_width: event.document_width,
          document_height: event.document_height,
          element_id: event.element_id,
          element_classes: event.element_classes,
          element_tag: event.element_tag,
          element_text: event.element_text,
          element_selector: event.element_selector,
        },
      })),
      siteId: SITE_ID,
    });

    // Use sendBeacon for better reliability on page unload
    // Create Blob with proper Content-Type to ensure server receives JSON
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon(API_COLLECT_ENDPOINT, blob);
      if (sent) {
        console.log(`✓ Sent ${eventsToSend.length} events via sendBeacon`);
      } else {
        console.warn(
          "sendBeacon returned false, events may not have been sent"
        );
        // Re-queue events if sendBeacon failed
        if (eventQueue.length < BATCH_SIZE * 2) {
          eventQueue.unshift(...eventsToSend);
        }
      }
      isProcessing = false;
    } else {
      // Fallback to fetch - explicitly no credentials for CORS compatibility
      fetch(API_COLLECT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
        keepalive: true,
        credentials: "omit", // Don't send cookies - allows CORS with wildcard origin
        mode: "cors",
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

  function getDeviceType(viewportWidth) {
    if (viewportWidth < 768) return "mobile";
    if (viewportWidth < 1024) return "tablet";
    return "desktop";
  }

  // Optimized Smart Selector
  function getSmartSelector(el) {
    if (!el || el.tagName === "BODY") return "BODY";
    if (el.id) return `#${el.id}`;

    // Include all class names for better uniqueness
    let selector = el.tagName;
    if (el.className) {
      selector += `.${Array.from(el.classList).join(".")}`;
    }

    const parent = el.parentElement;
    if (!parent) return selector;

    const siblings = Array.from(parent.children).filter(
      (child) => child.tagName === el.tagName
    );
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      selector += `:nth-of-type(${index})`;
    }

    return `${getSmartSelector(parent)} > ${selector}`;
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

  // Custom image loader to handle CORS and 400 errors gracefully
  function createImageLoader() {
    const originalImage = window.Image;

    // Override Image constructor to handle loading errors
    window.Image = function (width, height) {
      const img = new originalImage(width, height);

      // Store original src setter
      const originalSrcSetter = Object.getOwnPropertyDescriptor(
        originalImage.prototype,
        "src"
      ).set;

      // Override src setter to handle errors
      Object.defineProperty(img, "src", {
        set: function (value) {
          if (
            value &&
            (value.startsWith("http://") || value.startsWith("https://"))
          ) {
            // For external URLs, try to fetch first
            fetch(value, {
              method: "GET",
              mode: "cors",
              credentials: "omit",
              headers: {
                Accept: "image/*,*/*",
                "Cache-Control": "no-cache",
              },
            })
              .then((response) => {
                if (
                  response.ok &&
                  response.headers.get("content-type")?.startsWith("image/")
                ) {
                  // If fetch succeeds and it's actually an image, load it
                  return response.blob().then((blob) => {
                    const objectUrl = URL.createObjectURL(blob);
                    originalSrcSetter.call(this, objectUrl);
                    // Clean up object URL after image loads
                    this.addEventListener(
                      "load",
                      () => URL.revokeObjectURL(objectUrl),
                      { once: true }
                    );
                  });
                } else {
                  console.warn(
                    `Navlens: Skipping non-image or failed response (${response.status}) for: ${value}`
                  );
                  this._navlens_skip = true;
                }
              })
              .catch((error) => {
                console.warn(
                  `Navlens: Image fetch failed for ${value}:`,
                  error.message
                );
                this._navlens_skip = true;
              });
          } else {
            // For relative URLs, data URLs, or other cases, use original setter
            originalSrcSetter.call(this, value);
          }
        },
        get: function () {
          return this._src || "";
        },
      });

      return img;
    };

    // Copy prototype
    window.Image.prototype = originalImage.prototype;

    return {
      restore: () => {
        window.Image = originalImage;
      },
    };
  }

  async function captureSnapshotForDevice(deviceType) {
    if (typeof rrwebSnapshot === "undefined") {
      console.warn(
        `Navlens: rrwebSnapshot not loaded, skipping ${deviceType} snapshot`
      );
      return;
    }

    try {
      console.log(`Navlens: Starting DOM snapshot capture for ${deviceType}`);

      // Install custom image loader to handle 400 errors gracefully
      const imageLoader = createImageLoader();

      // Add timeout wrapper for snapshot capture to prevent hanging on slow images
      const snapshotPromise = new Promise((resolve, reject) => {
        try {
          const snap = rrwebSnapshot.snapshot(document, {
            inlineStylesheet: true, // Critical: Inlines all stylesheet content into the snapshot
            inlineImages: true, // Re-enabled: Converts images to Base64 data strings
            recordCanvas: false,
          });
          resolve(snap);
        } catch (error) {
          reject(error);
        }
      });

      // Timeout after 15 seconds to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Snapshot timeout")), 15000);
      });

      let snap = await Promise.race([snapshotPromise, timeoutPromise]);

      // Restore original Image constructor
      imageLoader.restore();

      // 2. RUN THE INVISIBLE CLEANER
      // This cleans the JSON data. The user sees absolutely nothing.
      snap = sanitizeSnapshot(snap);

      console.log(
        `Navlens: DOM snapshot captured for ${deviceType}, size: ${
          JSON.stringify(snap).length
        } bytes`
      ); // Extract CSS - OPTIMIZED for Next.js/React compatibility
      const styles = [];
      let adoptedStyleSheetCount = 0;

      // 1. Collect all <style> tags (Inline CSS & CSS-in-JS) using CSSOM
      // Use document.styleSheets for better access to dynamic styles
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          // Check if it's an inline style tag (no href)
          if (sheet.ownerNode && sheet.ownerNode.tagName === "STYLE") {
            // Accessing cssRules directly is better than textContent for dynamic styles
            const rules = Array.from(sheet.cssRules || [])
              .map((r) => r.cssText)
              .join("\n");
            if (rules) {
              styles.push({ type: "inline", content: rules });
            } else if (sheet.ownerNode.textContent) {
              // Fallback to text content if rules are inaccessible
              styles.push({
                type: "inline",
                content: sheet.ownerNode.textContent,
              });
            }
          }
        } catch (e) {
          // SecurityError (CORS) might happen if we try to read rules from a cross-origin sheet
          console.warn("Navlens: Could not read inline style rules", e);
        }
      });

      // 1b. Capture Constructed Stylesheets (document.adoptedStyleSheets) - Modern React/Angular apps
      // These are invisible to querySelectorAll and document.styleSheets
      if (
        document.adoptedStyleSheets &&
        Array.isArray(document.adoptedStyleSheets)
      ) {
        document.adoptedStyleSheets.forEach((sheet) => {
          try {
            const rules = Array.from(sheet.cssRules || [])
              .map((r) => r.cssText)
              .join("\n");
            if (rules) {
              styles.push({
                type: "inline",
                content: rules,
                source: "adoptedStyleSheet",
              });
              adoptedStyleSheetCount++;
            }
          } catch (e) {
            console.warn("Navlens: Could not read adoptedStyleSheet rules", e);
          }
        });
      }

      // 2. Collect all <link> stylesheets (External CSS) with ABSOLUTE URLs
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(
        (link) => {
          // Use the browser's resolved absolute URL property
          if (link.href) {
            styles.push({
              type: "link",
              href: link.href, // This is ALWAYS absolute (e.g., https://site.com/_next/...)
              originalHref: link.getAttribute("href"), // Keep original for debugging
            });
          }
        }
      );

      console.log(
        `Navlens: Extracted ${styles.length} CSS sources (${
          styles.filter((s) => s.type === "inline").length
        } inline, ${
          styles.filter((s) => s.type === "link").length
        } links, ${adoptedStyleSheetCount} adopted) for ${deviceType}`
      );

      // 1. Generate a Unique Hash of the current visual content
      // We purposefully ignore <script> tags to avoid false positives from
      // random tokens or trackers changing inside scripts.
      const contentToHash = document.body.innerHTML.replace(
        /<script\b[^>]*>([\s\S]*?)<\/script>/gm,
        ""
      );
      const currentHash = generateContentHash(contentToHash);

      // 2. Define Cache Keys
      const cacheKeyTime = `navlens_snap_time_${window.location.pathname}_${deviceType}`;
      const cacheKeyHash = `navlens_snap_hash_${window.location.pathname}_${deviceType}`;

      const lastSnapTime = localStorage.getItem(cacheKeyTime);
      const lastSnapHash = localStorage.getItem(cacheKeyHash);

      const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 Days

      // 3. Smart Validation Logic
      const isTimeExpired =
        !lastSnapTime || Date.now() - parseInt(lastSnapTime) > CACHE_DURATION;
      const isContentChanged = lastSnapHash !== currentHash;

      // If time is valid AND the hash is exactly the same, skip.
      if (!isTimeExpired && !isContentChanged) {
        console.log(
          `Navlens: Snapshot cached & visuals identical (Hash: ${currentHash}). Skipping.`
        );
        return;
      }

      if (isContentChanged) {
        console.log(
          `Navlens: Visuals changed (Hash ${lastSnapHash} -> ${currentHash}). Forcing new snapshot.`
        );
      }

      // Compress snapshot data (remove unnecessary properties)
      // const compressedSnap = compressSnapshot(snap);

      const payload = {
        site_id: SITE_ID,
        // NOTE: No API key sent - server validates via site_id + Origin header
        page_path: window.location.pathname,
        device_type: deviceType,
        snapshot: snap, // compressedSnap,
        styles: styles, // Include extracted CSS
        origin: window.location.origin, // Include origin for base tag in iframe
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
            localStorage.setItem(cacheKeyTime, Date.now().toString());
            localStorage.setItem(cacheKeyHash, currentHash); // Save the new Hash
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
      // Restore original Image constructor in case of error
      try {
        imageLoader.restore();
      } catch {
        // Ignore restore errors
      }

      if (error.message === "Snapshot timeout") {
        console.warn(
          `Navlens: Snapshot capture timed out for ${deviceType} (likely due to slow image loading). Skipping this snapshot.`
        );
      } else {
        console.warn(
          `Navlens: Error capturing snapshot for ${deviceType}:`,
          error
        );
      }
      // Continue with other device types even if one fails
    }
  }

  // Capture snapshots for all device types
  function captureSnapshotsForAllDevices() {
    const width = window.innerWidth;
    let currentDevice = "desktop";

    if (width < 768) {
      currentDevice = "mobile";
    } else if (width < 1024) {
      currentDevice = "tablet";
    }

    console.log(
      `Navlens: Detecting device as ${currentDevice}. Capturing snapshot...`
    );

    // Only capture the REAL view the user is seeing
    // We wait 3000ms to ensure animations/layout settle (as discussed previously)
    setTimeout(() => {
      captureSnapshotForDevice(currentDevice);
    }, 3000);
  }

  // Compress snapshot by removing redundant data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function compressSnapshot(snap) {
    // Remove style attributes that are not needed for heatmaps
    function cleanNode(node) {
      if (node.attributes) {
        delete node.attributes.style;
        // Keep class for selectors
        // delete node.attributes.class;
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

    // Debug viewport and screen sizes
    console.log("Navlens: Event metadata:", {
      eventType,
      viewportWidth,
      viewportHeight,
      screenWidth: screen.width,
      screenHeight: screen.height,
      deviceType: getDeviceType(viewportWidth),
    });

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
      client_id: getVisitorId(), // Use same ID as visitor_id
      ...payload,
    };
  }

  // --- Optimized Event Listeners ---

  // Page View Event - delayed to avoid blocking
  // Important: page_view must be sent immediately for funnel tracking
  function handlePageView() {
    setTimeout(() => {
      addEventToQueue(
        createEvent("page_view", {
          load_time: performance.now(),
        })
      );
      // Flush immediately to ensure page_view is captured for funnels
      // This is critical because users might leave before the batch timer fires
      flushEventQueue();
      // Start loading rrweb after page load
      loadRrwebSnapshot();
    }, 100);
  }
  window.addEventListener("load", handlePageView);

  // Click Event with improved throttling and coordinate capture
  function handleClick(event) {
    const now = Date.now();
    if (now - lastClickTime < CLICK_THROTTLE_MS) return;
    lastClickTime = now;

    const target = event.target;

    // Improved coordinate capture for cross-browser compatibility
    let x, y;

    // For touch devices, pageX/pageY might not be available on click events
    // Use clientX/clientY + scroll offsets as fallback
    if (
      event.pageX !== undefined &&
      event.pageY !== undefined &&
      event.pageX !== 0 &&
      event.pageY !== 0
    ) {
      x = event.pageX;
      y = event.pageY;
    } else {
      // Fallback for mobile devices where pageX/pageY might be 0
      x = event.clientX + window.scrollX;
      y = event.clientY + window.scrollY;
    }

    // Ensure coordinates are valid numbers
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      isNaN(x) ||
      isNaN(y) ||
      x < 0 ||
      y < 0
    ) {
      console.warn("Invalid click coordinates captured:", {
        x,
        y,
        pageX: event.pageX,
        pageY: event.pageY,
        clientX: event.clientX,
        clientY: event.clientY,
      });
      return; // Skip invalid clicks
    }

    const docWidth = document.documentElement.scrollWidth || window.innerWidth;
    const docHeight =
      document.documentElement.scrollHeight || window.innerHeight;

    // Calculate current scroll depth - percentage of page content viewed
    const currentScrollY = window.scrollY;
    const totalPageHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const scrollDepth =
      totalPageHeight > 0
        ? Math.min(
            1,
            Math.max(0, (currentScrollY + viewportHeight) / totalPageHeight)
          )
        : 0;

    console.log("Navlens: Click captured:", {
      x: Math.round(x),
      y: Math.round(y),
      x_relative: docWidth > 0 ? parseFloat((x / docWidth).toFixed(4)) : 0,
      y_relative: docHeight > 0 ? parseFloat((y / docHeight).toFixed(4)) : 0,
      target: target.tagName,
      id: target.id,
      classes: target.className,
    });

    addEventToQueue(
      createEvent("click", {
        x: Math.round(x), // Round to avoid float precision issues
        y: Math.round(y),
        x_relative: docWidth > 0 ? parseFloat((x / docWidth).toFixed(4)) : 0,
        y_relative: docHeight > 0 ? parseFloat((y / docHeight).toFixed(4)) : 0,
        scroll_depth: scrollDepth,
        // Store document dimensions at time of click for accurate remapping
        document_width: Math.round(docWidth),
        document_height: Math.round(docHeight),
        element_id: target.id || "",
        element_classes: Array.from(target.classList).join(" ") || "",
        element_tag: target.tagName || "",
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
    const totalPageHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const scrollDepth =
      totalPageHeight > 0
        ? Math.min(
            1,
            Math.max(0, (currentScrollY + viewportHeight) / totalPageHeight)
          )
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

  // --- Route Change Detection for SPAs (e.g., Next.js) ---
  let currentPath = window.location.pathname;
  let lastSnapshotTime = 0;
  const SNAPSHOT_COOLDOWN = 2000; // Prevent rapid re-captures (2 seconds)

  function checkForRouteChange() {
    const newPath = window.location.pathname;
    if (newPath !== currentPath) {
      console.log(`Navlens: Route changed from ${currentPath} to ${newPath}`);
      currentPath = newPath;

      // Throttle snapshot captures to avoid spam on quick navigations
      const now = Date.now();
      if (now - lastSnapshotTime > SNAPSHOT_COOLDOWN) {
        lastSnapshotTime = now;
        // Re-trigger DOM snapshot capture for the new page
        if (typeof rrwebSnapshot !== "undefined") {
          captureSnapshotsForAllDevices();
        } else {
          // If rrweb-snapshot isn't loaded yet, load it and capture
          loadRrwebSnapshot();
        }
      }
    }
  }

  // Poll for route changes every 500ms (lightweight for SPAs)
  setInterval(checkForRouteChange, 500);

  // Expose trackEvent globally
  window.trackEvent = function (eventType, payload) {
    addEventToQueue(createEvent(eventType, payload));
  };

  // --- INVISIBLE SNAPSHOT SANITIZER ---
  // This cleans the DATA, not the live DOM. Zero impact on user.
  function sanitizeSnapshot(node) {
    if (!node) return node;

    // 1. Sanitize Element Nodes
    if (node.type === 2) {
      // Type 2 is an Element
      const attrs = node.attributes || {};

      // Fix Inline Styles (The "JS Animation" Problem)
      if (attrs.style) {
        // Replace opacity: 0 with opacity: 1
        attrs.style = attrs.style.replace(
          /opacity\s*:\s*0(\.0+)?/g,
          "opacity: 1"
        );

        // Replace visibility: hidden with visibility: visible
        attrs.style = attrs.style.replace(
          /visibility\s*:\s*hidden/g,
          "visibility: visible"
        );

        // Kill transforms (prevents elements from being stuck "sliding in")
        if (attrs.style.includes("transform:")) {
          // We simply remove the transform property to let it sit in its natural place
          attrs.style = attrs.style.replace(
            /transform\s*:[^;]+;?/g,
            "transform: none !important;"
          );
        }
      }

      // Optional: Ensure all "aos" (Animate On Scroll) elements are marked as visible
      if (attrs.class && typeof attrs.class === "string") {
        if (attrs.class.includes("aos-")) {
          // We append a style to force visibility on these specific nodes
          attrs.style =
            (attrs.style || "") +
            "; opacity: 1 !important; visibility: visible !important; transform: none !important;";
        }
      }
    }

    // 2. Recursively Clean Children
    if (node.childNodes && node.childNodes.length > 0) {
      node.childNodes.forEach((child) => sanitizeSnapshot(child));
    }

    return node;
  }

  // --- Utility: Fast String Hashing (DJB2 Algorithm) ---
  // This turns a massive HTML string into a short unique ID number.
  function generateContentHash(str) {
    let hash = 5381;
    let i = str.length;
    while (i) {
      hash = (hash * 33) ^ str.charCodeAt(--i);
    }
    // Force to unsigned 32-bit integer for consistency
    return (hash >>> 0).toString();
  }
})();
