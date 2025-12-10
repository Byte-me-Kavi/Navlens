/**
 * Navlens Analytics Tracker v5.2 - Enterprise Edition
 *
 * Features:
 * - Time-Slicing Scheduler (non-blocking DOM operations)
 * - Client-Side Compression (gzip payloads)
 * - Automatic PII Scrubbing (email, phone, CC, SSN, IP)
 * - Smart Dead Click Detection (MutationObserver-based)
 * - rrweb Session Recording
 * - DOM Snapshot Capture
 * - Session Timeout/Renewal (30min)
 * - Visibility Change Tracking
 * - Retry Queue for Failed Requests
 * - DOM Hash Change Detection
 * - Proper API Event Wrapping (v5.2)
 *
 * @author Navlens Team
 */

(function () {
  "use strict";

  // ============================================
  // CONFIGURATION
  // ============================================
  const script = document.currentScript;
  const API_KEY = script?.dataset?.apiKey || "";
  const SITE_ID = script?.dataset?.siteId || "";
  const API_HOST = script?.dataset?.apiHost || "https://navlens-rho.vercel.app";

  // Validate required configuration
  if (!SITE_ID) {
    console.warn(
      "[Navlens] Missing data-site-id attribute. Tracker will not work."
    );
  }
  if (!API_KEY) {
    console.warn(
      "[Navlens] Missing data-api-key attribute. Tracker will not work."
    );
  }

  // Normalize API host
  const normalizedHost = API_HOST.includes("://")
    ? API_HOST
    : `https://${API_HOST}`;

  // Endpoints - All events go through v1/ingest
  const V1_INGEST_ENDPOINT = `${normalizedHost}/api/v1/ingest`;
  const RRWEB_EVENTS_ENDPOINT = `${normalizedHost}/api/rrweb-events`;
  const DOM_SNAPSHOT_ENDPOINT = `${normalizedHost}/api/dom-snapshot`;
  const DEBUG_EVENTS_ENDPOINT = `${normalizedHost}/api/v1/debug-events`;
  const FORM_EVENTS_ENDPOINT = `${normalizedHost}/api/v1/form-events`;

  // ============================================
  // EVENT FORMAT WRAPPER
  // Wraps events in the format expected by v1/ingest API:
  // { events: [...], siteId: "uuid" }

  /**
   * Wrap event data in the format expected by the API
   * Converts event_type to type and wraps in events array
   * @param {Object} eventData - The event data object
   * @returns {Object} - Wrapped event { events: [...], siteId }
   */
  function wrapEventForApi(eventData) {
    // Clone the event data and transform event_type to type
    const transformedEvent = { ...eventData };

    // Convert event_type to type (API expects 'type' field)
    if (transformedEvent.event_type) {
      transformedEvent.type = transformedEvent.event_type;
      delete transformedEvent.event_type;
    }

    // Add required fields if missing
    if (!transformedEvent.timestamp) {
      transformedEvent.timestamp = new Date().toISOString();
    }
    if (!transformedEvent.session_id) {
      transformedEvent.session_id = SESSION_ID;
    }

    // Extract device info for proper field mapping
    const deviceInfo = transformedEvent.device_info || getDeviceInfo();

    // Map fields to match API validation expectations
    const apiEvent = {
      type: transformedEvent.type,
      timestamp: transformedEvent.timestamp,
      session_id: transformedEvent.session_id,
      user_id: transformedEvent.user_id || null,
      page_url: transformedEvent.page_url || window.location.href,
      page_path: transformedEvent.page_path || window.location.pathname,
      referrer: transformedEvent.referrer || document.referrer || "",
      user_agent: deviceInfo.user_agent || navigator.userAgent,
      user_language: deviceInfo.language || navigator.language,
      viewport_width: deviceInfo.viewport_width || window.innerWidth,
      viewport_height: deviceInfo.viewport_height || window.innerHeight,
      screen_width: deviceInfo.screen_width || screen.width,
      screen_height: deviceInfo.screen_height || screen.height,
      device_type: deviceInfo.device_type || getDeviceType(),
      client_id: transformedEvent.client_id || API_KEY,
      load_time: transformedEvent.load_time || 0,
      // Store all extra fields in data object
      data: {
        event_id: transformedEvent.event_id,
        element_selector: transformedEvent.element_selector,
        element_tag: transformedEvent.element_tag,
        element_id: transformedEvent.element_id,
        element_classes: transformedEvent.element_class, // Map element_class to element_classes for ClickHouse
        element_text: transformedEvent.element_text,
        element_href: transformedEvent.element_href,
        x: transformedEvent.x,
        y: transformedEvent.y,
        click_x: transformedEvent.click_x,
        click_y: transformedEvent.click_y,
        page_x: transformedEvent.page_x,
        page_y: transformedEvent.page_y,
        x_relative: transformedEvent.x_relative,
        y_relative: transformedEvent.y_relative,
        document_width: transformedEvent.document_width,
        document_height: transformedEvent.document_height,
        element_position: transformedEvent.element_position,
        is_interactive: transformedEvent.is_interactive,
        is_dead_click: transformedEvent.is_dead_click,
        scroll_depth: transformedEvent.scroll_depth,
        max_scroll_depth: transformedEvent.max_scroll_depth,
        click_count: transformedEvent.click_count,
        visible_time_ms: transformedEvent.visible_time_ms,
        total_visible_time_ms: transformedEvent.total_visible_time_ms,
        page_title: transformedEvent.page_title,
        event_name: transformedEvent.event_name,
        properties: transformedEvent.properties,
        traits: transformedEvent.traits,
      },
    };

    // Remove undefined values from data object
    Object.keys(apiEvent.data).forEach((key) => {
      if (apiEvent.data[key] === undefined) {
        delete apiEvent.data[key];
      }
    });

    return {
      events: [apiEvent],
      siteId: SITE_ID,
    };
  }

  /**
   * Send wrapped event data via sendBeacon
   * @param {string} endpoint - The API endpoint
   * @param {Object} eventData - The event data to send
   */
  function sendWrappedBeacon(endpoint, eventData) {
    const wrappedData = wrapEventForApi(eventData);
    const blob = new Blob([JSON.stringify(wrappedData)], {
      type: "application/json",
    });

    if (navigator.sendBeacon) {
      return navigator.sendBeacon(endpoint, blob);
    } else {
      fetch(endpoint, {
        method: "POST",
        body: blob,
        keepalive: true,
      }).catch(console.error);
      return true;
    }
  }

  /**
   * Send wrapped event data via fetch with compression
   * @param {string} endpoint - The API endpoint
   * @param {Object} eventData - The event data to send
   */
  async function sendWrappedFetch(endpoint, eventData) {
    const wrappedData = wrapEventForApi(eventData);
    return sendCompressedFetch(endpoint, wrappedData);
  }

  // Session Configuration
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const SESSION_STORAGE_KEY = "navlens_session";
  const VISITOR_STORAGE_KEY = "navlens_visitor";

  // DOM Hash Configuration
  const DOM_HASH_CHECK_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes
  let lastDomHash = null;
  let domHashCheckTimer = null;

  // ============================================
  // TIME-SLICING SCHEDULER
  // Non-blocking task execution using requestIdleCallback
  // ============================================
  const taskQueue = [];
  let isSchedulerRunning = false;
  const FRAME_BUDGET_MS = 16; // 60fps frame budget

  /**
   * Schedule a task for non-blocking execution
   * @param {Function} task - The task to execute
   * @param {string} priority - 'high', 'normal', or 'idle'
   * @returns {Promise} - Resolves when task completes
   */
  function scheduleTask(task, priority = "idle") {
    return new Promise((resolve, reject) => {
      const taskEntry = {
        task,
        priority,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Insert based on priority
      if (priority === "high") {
        taskQueue.unshift(taskEntry);
      } else {
        taskQueue.push(taskEntry);
      }

      if (!isSchedulerRunning) {
        runScheduler();
      }
    });
  }

  /**
   * Run the task scheduler using requestIdleCallback
   */
  function runScheduler() {
    if (taskQueue.length === 0) {
      isSchedulerRunning = false;
      return;
    }

    isSchedulerRunning = true;

    const scheduleNext = (deadline) => {
      // Process tasks while we have time in this frame
      while (
        taskQueue.length > 0 &&
        (deadline?.timeRemaining?.() > 0 || !deadline)
      ) {
        const startTime = performance.now();
        const entry = taskQueue.shift();

        try {
          const result = entry.task();
          // Handle async tasks
          if (result instanceof Promise) {
            result.then(entry.resolve).catch(entry.reject);
          } else {
            entry.resolve(result);
          }
        } catch (error) {
          entry.reject(error);
        }

        // Check if we've exceeded frame budget
        if (performance.now() - startTime > FRAME_BUDGET_MS) {
          break;
        }
      }

      // Schedule next batch if tasks remain
      if (taskQueue.length > 0) {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(scheduleNext, { timeout: 100 });
        } else {
          setTimeout(() => scheduleNext(null), 0);
        }
      } else {
        isSchedulerRunning = false;
      }
    };

    // Start processing
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(scheduleNext, { timeout: 100 });
    } else {
      setTimeout(() => scheduleNext(null), 0);
    }
  }

  // ============================================
  // CLIENT-SIDE COMPRESSION
  // gzip compression for payloads using CompressionStream
  // ============================================

  /**
   * Check if compression is supported
   * @returns {boolean}
   */
  function isCompressionSupported() {
    return typeof CompressionStream !== "undefined";
  }

  /**
   * Compress data using gzip
   * @param {Object|string} data - Data to compress
   * @returns {Promise<Blob>} - Compressed blob
   */
  async function compressPayload(data) {
    const jsonString = typeof data === "string" ? data : JSON.stringify(data);
    const encoder = new TextEncoder();
    const inputBytes = encoder.encode(jsonString);

    if (!isCompressionSupported()) {
      // Fallback: return uncompressed
      return new Blob([inputBytes], { type: "application/json" });
    }

    try {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(inputBytes);
          controller.close();
        },
      });

      const compressedStream = stream.pipeThrough(
        new CompressionStream("gzip")
      );
      const reader = compressedStream.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return new Blob([result], { type: "application/gzip" });
    } catch (error) {
      console.warn(
        "[Navlens] Compression failed, sending uncompressed:",
        error
      );
      return new Blob([inputBytes], { type: "application/json" });
    }
  }

  // ============================================
  // RETRY QUEUE FOR FAILED REQUESTS
  // ============================================
  const retryQueue = [];
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000;
  let retryTimerId = null;

  function addToRetryQueue(url, payload, retryCount = 0) {
    if (retryCount >= MAX_RETRIES) {
      console.warn("[Navlens] Max retries reached, dropping event");
      return;
    }
    retryQueue.push({ url, payload, retryCount });
    scheduleRetry();
  }

  function scheduleRetry() {
    if (retryTimerId) return;
    retryTimerId = setTimeout(processRetryQueue, RETRY_DELAY_MS);
  }

  async function processRetryQueue() {
    retryTimerId = null;
    if (retryQueue.length === 0) return;

    const items = retryQueue.splice(0, 5); // Process 5 at a time

    for (const item of items) {
      try {
        await sendCompressedFetch(item.url, item.payload, false);
      } catch (error) {
        addToRetryQueue(item.url, item.payload, item.retryCount + 1);
      }
    }

    if (retryQueue.length > 0) {
      scheduleRetry();
    }
  }

  /**
   * Send compressed fetch request
   * @param {string} url - Endpoint URL
   * @param {Object} payload - Data to send
   * @param {boolean} addToRetry - Whether to add to retry queue on failure
   * @returns {Promise<Response>}
   */
  async function sendCompressedFetch(url, payload, addToRetry = true) {
    const compressed = await compressPayload(payload);
    const isGzipped = compressed.type === "application/gzip";

    const headers = {
      "x-api-key": API_KEY,
    };

    if (isGzipped) {
      headers["Content-Encoding"] = "gzip";
      headers["Content-Type"] = "application/json";
    } else {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: compressed,
        keepalive: true,
      });

      if (!response.ok && addToRetry) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      if (addToRetry) {
        addToRetryQueue(url, payload);
      }
      throw error;
    }
  }

  // ============================================
  // PII SCRUBBING
  // Automatic detection and redaction of sensitive data
  // ============================================
  const PII_PATTERNS = {
    email: {
      pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      replacement: "[EMAIL_REDACTED]",
    },
    phone: {
      pattern:
        /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/g,
      replacement: "[PHONE_REDACTED]",
    },
    creditCard: {
      pattern:
        /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})/g,
      replacement: "[CC_REDACTED]",
    },
    ssn: {
      pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
      replacement: "[SSN_REDACTED]",
    },
    ipAddress: {
      pattern:
        /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      replacement: "[IP_REDACTED]",
    },
  };

  /**
   * Scrub PII from a string
   * @param {string} text - Text to scrub
   * @returns {string} - Scrubbed text
   */
  function scrubPII(text) {
    if (typeof text !== "string") return text;

    let scrubbed = text;
    for (const [type, config] of Object.entries(PII_PATTERNS)) {
      scrubbed = scrubbed.replace(config.pattern, config.replacement);
    }
    return scrubbed;
  }

  /**
   * Recursively scrub PII from an object
   * @param {Object} obj - Object to scrub
   * @param {number} depth - Current recursion depth
   * @returns {Object} - Scrubbed object
   */
  function scrubObjectPII(obj, depth = 0) {
    if (depth > 10) return obj; // Prevent infinite recursion
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === "string") {
      return scrubPII(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => scrubObjectPII(item, depth + 1));
    }

    if (typeof obj === "object") {
      const scrubbed = {};
      for (const [key, value] of Object.entries(obj)) {
        scrubbed[key] = scrubObjectPII(value, depth + 1);
      }
      return scrubbed;
    }

    return obj;
  }

  // ============================================
  // DEVELOPER TOOLS DEBUG DATA CAPTURE
  // Console logs, Network requests, Web Vitals
  // ============================================
  
  // Debug event buffer and configuration
  const debugEventBuffer = [];
  const DEBUG_BATCH_INTERVAL_MS = 2000; // Send every 2 seconds
  const DEBUG_BATCH_SIZE = 10; // Or when buffer reaches 10 events
  const MAX_CONSOLE_EVENTS = 100; // Max console events per session
  const MAX_NETWORK_EVENTS = 200; // Max network events per session
  let consoleEventCount = 0;
  let networkEventCount = 0;
  let debugBatchTimer = null;
  let webVitalsSent = false;

  /**
   * Add debug event to buffer and schedule send
   * @param {Object} event - Debug event data
   */
  function bufferDebugEvent(event) {
    debugEventBuffer.push({
      ...event,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_path: window.location.pathname,
    });

    // Send immediately if buffer is full
    if (debugEventBuffer.length >= DEBUG_BATCH_SIZE) {
      flushDebugEvents();
    } else if (!debugBatchTimer) {
      // Schedule batch send
      debugBatchTimer = setTimeout(flushDebugEvents, DEBUG_BATCH_INTERVAL_MS);
    }
  }

  /**
   * Flush debug events to server
   */
  async function flushDebugEvents() {
    if (debugBatchTimer) {
      clearTimeout(debugBatchTimer);
      debugBatchTimer = null;
    }

    if (debugEventBuffer.length === 0) return;

    // Copy and clear buffer
    const events = debugEventBuffer.splice(0, debugEventBuffer.length);

    try {
      await sendCompressedFetch(DEBUG_EVENTS_ENDPOINT, {
        events,
        siteId: SITE_ID,
        sessionId: SESSION_ID,
      }, false); // Don't add to retry queue for debug events
    } catch (error) {
      // Silently fail - debug data is non-critical
      console.warn('[Navlens] Debug event send failed:', error.message);
    }
  }

  // ============================================
  // CONSOLE INTERCEPTOR
  // Captures console.log, warn, error, info, debug
  // ============================================
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  /**
   * Get stack trace for error logging
   */
  function getStackTrace() {
    try {
      throw new Error();
    } catch (e) {
      const stack = e.stack || '';
      // Remove first 3 lines (Error, getStackTrace, interceptor)
      return stack.split('\n').slice(3).join('\n').substring(0, 2000);
    }
  }

  /**
   * Intercept console method
   * @param {string} level - Console level (log, warn, error, etc.)
   */
  function interceptConsole(level) {
    console[level] = function (...args) {
      // Always call original
      originalConsole[level].apply(console, args);

      // Skip if we've hit the limit or if it's a Navlens message
      if (consoleEventCount >= MAX_CONSOLE_EVENTS) return;
      const message = args.map(arg => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        } catch {
          return '[Unserializable]';
        }
      }).join(' ');

      // Skip Navlens internal logs
      if (message.includes('[Navlens]')) return;

      consoleEventCount++;
      bufferDebugEvent({
        type: 'console',
        level,
        message: scrubPII(message.substring(0, 5000)),
        stack: level === 'error' ? getStackTrace() : '',
      });
    };
  }

  // Apply console interceptors
  ['log', 'warn', 'error', 'info', 'debug'].forEach(interceptConsole);

  // Also capture uncaught errors
  window.addEventListener('error', function (event) {
    if (consoleEventCount >= MAX_CONSOLE_EVENTS) return;
    consoleEventCount++;
    bufferDebugEvent({
      type: 'console',
      level: 'error',
      message: scrubPII(`Uncaught: ${event.message}`),
      stack: event.error?.stack ? scrubPII(event.error.stack.substring(0, 2000)) : '',
    });
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function (event) {
    if (consoleEventCount >= MAX_CONSOLE_EVENTS) return;
    consoleEventCount++;
    const reason = event.reason;
    bufferDebugEvent({
      type: 'console',
      level: 'error',
      message: scrubPII(`Unhandled Promise: ${reason?.message || String(reason)}`),
      stack: reason?.stack ? scrubPII(reason.stack.substring(0, 2000)) : '',
    });
  });

  // ============================================
  // NETWORK REQUEST MONITOR
  // Intercepts fetch() and XMLHttpRequest
  // ============================================
  
  // URLs to ignore (our own endpoints)
  const IGNORED_URL_PATTERNS = [
    '/api/v1/ingest',
    '/api/v1/debug-events',
    '/api/rrweb-events',
    '/api/dom-snapshot',
    'navlens',
  ];

  function shouldIgnoreUrl(url) {
    return IGNORED_URL_PATTERNS.some(pattern => url.includes(pattern));
  }

  /**
   * Sanitize URL - remove sensitive query parameters
   */
  function sanitizeUrl(url) {
    try {
      const urlObj = new URL(url, window.location.origin);
      const sensitiveParams = ['token', 'key', 'password', 'secret', 'auth', 'api_key', 'apikey', 'access_token'];
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });
      return urlObj.toString();
    } catch {
      return scrubPII(url);
    }
  }

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input.url;
    
    // Skip our own endpoints
    if (shouldIgnoreUrl(url)) {
      return originalFetch.apply(this, arguments);
    }

    const startTime = performance.now();
    const method = init?.method || 'GET';

    try {
      const response = await originalFetch.apply(this, arguments);
      const duration = Math.round(performance.now() - startTime);

      if (networkEventCount < MAX_NETWORK_EVENTS) {
        networkEventCount++;
        bufferDebugEvent({
          type: 'network',
          method: method.toUpperCase(),
          url: sanitizeUrl(url),
          status: response.status,
          duration_ms: duration,
          network_type: 'fetch',
          initiator: 'script',
        });
      }

      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);

      if (networkEventCount < MAX_NETWORK_EVENTS) {
        networkEventCount++;
        bufferDebugEvent({
          type: 'network',
          method: method.toUpperCase(),
          url: sanitizeUrl(url),
          status: 0, // Failed
          duration_ms: duration,
          network_type: 'fetch',
          initiator: 'script',
        });
      }

      throw error;
    }
  };

  // Intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._navlens_method = method;
    this._navlens_url = url;
    this._navlens_start = null;
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    const url = this._navlens_url;
    
    // Skip our own endpoints
    if (shouldIgnoreUrl(url)) {
      return originalXHRSend.apply(this, arguments);
    }

    this._navlens_start = performance.now();
    const method = this._navlens_method || 'GET';

    this.addEventListener('loadend', () => {
      if (networkEventCount >= MAX_NETWORK_EVENTS) return;

      const duration = Math.round(performance.now() - this._navlens_start);
      networkEventCount++;
      
      bufferDebugEvent({
        type: 'network',
        method: method.toUpperCase(),
        url: sanitizeUrl(url),
        status: this.status,
        duration_ms: duration,
        network_type: 'xhr',
        initiator: 'script',
      });
    });

    return originalXHRSend.apply(this, arguments);
  };

  // ============================================
  // CORE WEB VITALS OBSERVER
  // Tracks LCP, CLS, INP, FCP, TTFB
  // ============================================

  /**
   * Get rating for a web vital
   * @param {string} name - Vital name
   * @param {number} value - Vital value
   * @returns {string} - 'good', 'needs-improvement', or 'poor'
   */
  function getVitalRating(name, value) {
    const thresholds = {
      LCP: [2500, 4000],
      FID: [100, 300],
      CLS: [0.1, 0.25],
      INP: [200, 500],
      FCP: [1800, 3000],
      TTFB: [800, 1800],
    };

    const [good, poor] = thresholds[name] || [Infinity, Infinity];
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Observe and report Web Vitals
   */
  function observeWebVitals() {
    if (typeof PerformanceObserver === 'undefined') return;

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          bufferDebugEvent({
            type: 'web_vital',
            vital_name: 'LCP',
            vital_value: Math.round(lastEntry.startTime),
            vital_rating: getVitalRating('LCP', lastEntry.startTime),
          });
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) { /* Not supported */ }

    // First Contentful Paint (FCP)
    try {
      const fcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
        if (fcpEntry) {
          bufferDebugEvent({
            type: 'web_vital',
            vital_name: 'FCP',
            vital_value: Math.round(fcpEntry.startTime),
            vital_rating: getVitalRating('FCP', fcpEntry.startTime),
          });
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (e) { /* Not supported */ }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Report CLS on page hide
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && !webVitalsSent) {
          bufferDebugEvent({
            type: 'web_vital',
            vital_name: 'CLS',
            vital_value: Math.round(clsValue * 1000) / 1000, // Round to 3 decimals
            vital_rating: getVitalRating('CLS', clsValue),
          });
        }
      });
    } catch (e) { /* Not supported */ }

    // Interaction to Next Paint (INP) - using event timing
    try {
      let maxINP = 0;
      const inpObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const duration = entry.processingEnd - entry.startTime;
          if (duration > maxINP) {
            maxINP = duration;
          }
        }
      });
      inpObserver.observe({ type: 'event', buffered: true });

      // Report INP on page hide
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && maxINP > 0 && !webVitalsSent) {
          bufferDebugEvent({
            type: 'web_vital',
            vital_name: 'INP',
            vital_value: Math.round(maxINP),
            vital_rating: getVitalRating('INP', maxINP),
          });
          webVitalsSent = true;
          // Flush immediately on page hide
          flushDebugEvents();
        }
      });
    } catch (e) { /* Not supported */ }

    // Time to First Byte (TTFB)
    try {
      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) {
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        bufferDebugEvent({
          type: 'web_vital',
          vital_name: 'TTFB',
          vital_value: Math.round(ttfb),
          vital_rating: getVitalRating('TTFB', ttfb),
        });
      }
    } catch (e) { /* Not supported */ }
  }

  // Start observing Web Vitals
  observeWebVitals();

  // Flush debug events before page unload
  window.addEventListener('beforeunload', flushDebugEvents);
  window.addEventListener('pagehide', flushDebugEvents);

  // ============================================
  // FORM ANALYTICS
  // Track field drop-off, time-to-fill, refill rates
  // ============================================
  
  // Form tracking state
  const formEventBuffer = [];
  const FORM_BATCH_INTERVAL_MS = 3000; // Send every 3 seconds
  const FORM_BATCH_SIZE = 10;
  let formBatchTimer = null;
  const activeFields = new Map(); // field_id -> { focusTime, changeCount, lastValueLength }
  const trackedForms = new Map(); // form_id -> { fields, hasSubmitted }
  
  // Sensitive field patterns to skip
  const SENSITIVE_PATTERNS = [
    /password/i, /ssn/i, /social.*security/i, /credit.*card/i,
    /card.*number/i, /cvv/i, /cvc/i, /pin/i, /secret/i
  ];

  /**
   * Check if field should be skipped
   */
  function isSensitiveField(field) {
    if (field.type === 'password') return true;
    const name = (field.name || '') + (field.id || '');
    return SENSITIVE_PATTERNS.some(p => p.test(name));
  }

  /**
   * Get form identifier (prefer id, then name, then selector)
   */
  function getFormId(form) {
    if (form.id) return `id:${form.id}`;
    if (form.name) return `name:${form.name}`;
    // Generate selector-based ID
    const index = Array.from(document.forms).indexOf(form);
    return `form:${index}`;
  }

  /**
   * Get field identifier
   */
  function getFieldId(field) {
    if (field.id) return field.id;
    if (field.name) return field.name;
    // Use type + index as fallback
    const form = field.form;
    if (form) {
      const sameTypeFields = Array.from(form.elements).filter(e => e.type === field.type);
      const index = sameTypeFields.indexOf(field);
      return `${field.type}_${index}`;
    }
    return `field_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get field index within form
   */
  function getFieldIndex(field) {
    const form = field.form;
    if (!form) return 0;
    const inputs = Array.from(form.elements).filter(e => 
      ['input', 'select', 'textarea'].includes(e.tagName.toLowerCase()) &&
      !['hidden', 'submit', 'button', 'reset'].includes(e.type)
    );
    return inputs.indexOf(field) + 1;
  }

  /**
   * Buffer form event
   */
  function bufferFormEvent(event) {
    formEventBuffer.push({
      ...event,
      timestamp: new Date().toISOString(),
    });

    if (formEventBuffer.length >= FORM_BATCH_SIZE) {
      flushFormEvents();
    } else if (!formBatchTimer) {
      formBatchTimer = setTimeout(flushFormEvents, FORM_BATCH_INTERVAL_MS);
    }
  }

  /**
   * Flush form events to server
   */
  async function flushFormEvents() {
    if (formBatchTimer) {
      clearTimeout(formBatchTimer);
      formBatchTimer = null;
    }

    if (formEventBuffer.length === 0) return;

    const events = formEventBuffer.splice(0, formEventBuffer.length);

    try {
      await sendCompressedFetch(FORM_EVENTS_ENDPOINT, {
        events,
        siteId: SITE_ID,
        sessionId: SESSION_ID,
      }, false);
    } catch (error) {
      // Silently fail - form analytics is non-critical
    }
  }

  /**
   * Handle field focus
   */
  function handleFieldFocus(event) {
    const field = event.target;
    if (!field.form || isSensitiveField(field)) return;

    const fieldId = getFieldId(field);
    const formId = getFormId(field.form);
    const now = Date.now();

    // Store field state
    activeFields.set(fieldId, {
      focusTime: now,
      changeCount: 0,
      lastValueLength: (field.value || '').length,
      wasRefilled: false,
    });

    // Track form
    if (!trackedForms.has(formId)) {
      trackedForms.set(formId, { fields: new Set(), hasSubmitted: false });
    }
    trackedForms.get(formId).fields.add(fieldId);

    bufferFormEvent({
      form_id: formId,
      form_url: window.location.href,
      field_id: fieldId,
      field_name: field.name || '',
      field_type: field.type || 'text',
      field_index: getFieldIndex(field),
      interaction_type: 'focus',
      focus_time: new Date(now).toISOString(),
    });
  }

  /**
   * Handle field blur
   */
  function handleFieldBlur(event) {
    const field = event.target;
    if (!field.form || isSensitiveField(field)) return;

    const fieldId = getFieldId(field);
    const formId = getFormId(field.form);
    const fieldState = activeFields.get(fieldId);
    const now = Date.now();

    if (fieldState) {
      const timeSpent = now - fieldState.focusTime;
      const hasValue = (field.value || '').length > 0;

      bufferFormEvent({
        form_id: formId,
        form_url: window.location.href,
        field_id: fieldId,
        field_name: field.name || '',
        field_type: field.type || 'text',
        field_index: getFieldIndex(field),
        interaction_type: 'blur',
        focus_time: new Date(fieldState.focusTime).toISOString(),
        blur_time: new Date(now).toISOString(),
        time_spent_ms: Math.min(timeSpent, 3600000), // Cap at 1 hour
        change_count: fieldState.changeCount,
        was_refilled: fieldState.wasRefilled,
        field_had_value: hasValue,
      });

      activeFields.delete(fieldId);
    }
  }

  /**
   * Handle field change (for refill detection)
   */
  function handleFieldChange(event) {
    const field = event.target;
    if (!field.form || isSensitiveField(field)) return;

    const fieldId = getFieldId(field);
    const fieldState = activeFields.get(fieldId);

    if (fieldState) {
      fieldState.changeCount++;
      
      // Detect refill: value length decreased by >50% then increased
      const currentLength = (field.value || '').length;
      const lastLength = fieldState.lastValueLength;
      
      if (lastLength > 0 && currentLength < lastLength * 0.5) {
        // User deleted significant content - mark for potential refill
        fieldState.deletedContent = true;
      } else if (fieldState.deletedContent && currentLength > lastLength) {
        // User is retyping after deletion - this is a refill
        fieldState.wasRefilled = true;
        fieldState.deletedContent = false;
      }
      
      fieldState.lastValueLength = currentLength;
    }
  }

  /**
   * Handle form submit
   */
  function handleFormSubmit(event) {
    const form = event.target;
    const formId = getFormId(form);
    const formState = trackedForms.get(formId);

    if (formState) {
      formState.hasSubmitted = true;

      // Send submit event
      bufferFormEvent({
        form_id: formId,
        form_url: window.location.href,
        field_id: '',
        field_name: '',
        field_type: '',
        field_index: 0,
        interaction_type: 'submit',
        was_submitted: true,
      });

      // Flush immediately on submit
      flushFormEvents();
    }
  }

  /**
   * Handle page abandonment - mark incomplete forms
   */
  function handleFormAbandonment() {
    trackedForms.forEach((formState, formId) => {
      if (!formState.hasSubmitted && formState.fields.size > 0) {
        // Form was interacted with but not submitted
        bufferFormEvent({
          form_id: formId,
          form_url: window.location.href,
          field_id: '',
          field_name: '',
          field_type: '',
          field_index: 0,
          interaction_type: 'abandon',
          was_submitted: false,
        });
      }
    });

    flushFormEvents();
  }

  /**
   * Initialize form tracking
   */
  function initFormTracking() {
    // Use event delegation for efficiency
    document.addEventListener('focusin', (e) => {
      if (e.target.tagName && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        handleFieldFocus(e);
      }
    }, true);

    document.addEventListener('focusout', (e) => {
      if (e.target.tagName && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        handleFieldBlur(e);
      }
    }, true);

    document.addEventListener('input', (e) => {
      if (e.target.tagName && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
        handleFieldChange(e);
      }
    }, true);

    document.addEventListener('submit', handleFormSubmit, true);

    // Handle abandonment
    window.addEventListener('beforeunload', handleFormAbandonment);
    window.addEventListener('pagehide', handleFormAbandonment);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleFormAbandonment();
      }
    });
  }

  // Start form tracking
  initFormTracking();

  // ============================================
  // SESSION MANAGEMENT (with timeout/renewal)
  // ============================================
  function getOrCreateSession() {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        const now = Date.now();

        // Check if session is still valid
        if (now - session.lastActivity < SESSION_TIMEOUT_MS) {
          // Update last activity
          session.lastActivity = now;
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
          return session.id;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Create new session
    const newSession = {
      id: generateSessionId(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    return newSession.id;
  }

  function updateSessionActivity() {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        session.lastActivity = Date.now();
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
    } catch (e) {
      // Ignore
    }
  }

  function generateSessionId() {
    return (
      "sess_" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      "_" +
      Date.now()
    );
  }

  function generateEventId() {
    return (
      "evt_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now()
    );
  }

  function getOrCreateVisitorId() {
    try {
      const stored = localStorage.getItem(VISITOR_STORAGE_KEY);
      if (stored) {
        return stored;
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    // Create new visitor ID
    const visitorId =
      "vis_" +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      "_" +
      Date.now();

    try {
      localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
    } catch (e) {
      // Ignore localStorage errors
    }

    return visitorId;
  }

  // Initialize session and visitor
  let SESSION_ID = getOrCreateSession();
  let VISITOR_ID = getOrCreateVisitorId();

  // ============================================
  // BROWSER & DEVICE INFO
  // ============================================
  function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = "Unknown";

    if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/")) browser = "Chrome";
    else if (ua.includes("Safari/") && !ua.includes("Chrome"))
      browser = "Safari";
    else if (ua.includes("MSIE") || ua.includes("Trident/")) browser = "IE";

    return browser;
  }

  function getDeviceType() {
    const width = window.innerWidth;
    if (width < 768) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
  }

  function getDeviceInfo() {
    return {
      browser: getBrowserInfo(),
      device_type: getDeviceType(),
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      user_agent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
    };
  }

  // ============================================
  // DOCUMENT DIMENSIONS (for heatmap normalization)
  // ============================================
  function getDocumentDimensions() {
    return {
      width: Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.body.clientWidth,
        document.documentElement.clientWidth
      ),
      height: Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      ),
    };
  }

  // ============================================
  // DOM HASH GENERATION & CHANGE DETECTION
  // ============================================

  /**
   * Generate a hash of the current DOM structure
   * Uses a lightweight approach focusing on structure, not content
   */
  function generateDomHash() {
    try {
      const body = document.body;
      if (!body) return null;

      // Create a structural fingerprint
      const elements = body.querySelectorAll("*");
      let structure = "";

      // Sample elements for performance (every nth element)
      const sampleRate = Math.max(1, Math.floor(elements.length / 500));

      for (let i = 0; i < elements.length; i += sampleRate) {
        const el = elements[i];
        structure += el.tagName;
        if (el.id) structure += "#" + el.id;
        if (el.className && typeof el.className === "string") {
          // Only use first 2 classes to reduce noise
          const classes = el.className
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .join(".");
          if (classes) structure += "." + classes;
        }
        structure += "|";
      }

      // Add document dimensions to hash
      const dims = getDocumentDimensions();
      structure += `D:${dims.width}x${dims.height}`;

      // Simple hash function (djb2)
      let hash = 5381;
      for (let i = 0; i < structure.length; i++) {
        hash = (hash << 5) + hash + structure.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
      }

      return hash.toString(36);
    } catch (error) {
      console.warn("[Navlens] DOM hash generation failed:", error);
      return null;
    }
  }

  /**
   * Check if DOM has changed and trigger snapshot if needed
   */
  async function checkDomChanges() {
    const currentHash = generateDomHash();

    if (currentHash && lastDomHash && currentHash !== lastDomHash) {
      console.log("[Navlens] DOM structure changed, capturing new snapshot");

      // Schedule snapshot capture
      scheduleTask(async () => {
        const snapshot = await captureSnapshot();
        if (snapshot) {
          // Add hash to snapshot data (backend expects 'hash' not 'dom_hash')
          snapshot.hash = currentHash;
          snapshot.previous_hash = lastDomHash;
          await sendSnapshot(snapshot);
        }
      }, "idle");
    }

    lastDomHash = currentHash;
  }

  /**
   * Start periodic DOM hash checking
   */
  function startDomHashMonitoring() {
    // Set initial hash
    lastDomHash = generateDomHash();

    // Check periodically
    domHashCheckTimer = setInterval(checkDomChanges, DOM_HASH_CHECK_INTERVAL);

    // Also check on significant events
    window.addEventListener("resize", debounce(checkDomChanges, 1000));
    window.addEventListener("orientationchange", () =>
      setTimeout(checkDomChanges, 500)
    );
  }

  /**
   * Simple debounce utility
   */
  function debounce(fn, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ============================================
  // ELEMENT UTILITIES
  // ============================================
  function generateElementSelector(element) {
    if (!element) return "";

    const parts = [];
    let current = element;

    while (current && current !== document.body && parts.length < 5) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        parts.unshift(selector);
        break;
      }

      if (current.className && typeof current.className === "string") {
        const classes = current.className
          .trim()
          .split(/\s+/)
          .filter((c) => c && !c.startsWith("ng-"));
        if (classes.length > 0) {
          selector += "." + classes.slice(0, 2).join(".");
        }
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current);
          // Guard against edge case where element is not found in siblings
          if (index >= 0) {
            selector += `:nth-of-type(${index + 1})`;
          }
        }
      }

      parts.unshift(selector);
      current = parent;
    }

    return parts.join(" > ");
  }

  function getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      viewport_x: Math.round(rect.left),
      viewport_y: Math.round(rect.top),
    };
  }

  function isInteractiveElement(element) {
    if (!element) return false;

    const interactiveTags = [
      "A",
      "BUTTON",
      "INPUT",
      "SELECT",
      "TEXTAREA",
      "VIDEO",
      "AUDIO",
    ];
    if (interactiveTags.includes(element.tagName)) return true;

    if (element.getAttribute("role") === "button") return true;
    if (element.getAttribute("tabindex") !== null) return true;
    if (element.onclick) return true;

    const style = window.getComputedStyle(element);
    if (style.cursor === "pointer") return true;

    return false;
  }

  // ============================================
  // DEAD CLICK DETECTION (MutationObserver-based)
  // ============================================
  let domChangeDetected = false;
  let mutationObserver = null;

  function initMutationObserver() {
    if (mutationObserver) return;

    mutationObserver = new MutationObserver((mutations) => {
      // Check if any meaningful changes occurred
      for (const mutation of mutations) {
        if (
          mutation.type === "childList" &&
          (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)
        ) {
          domChangeDetected = true;
          return;
        }
        if (mutation.type === "attributes") {
          const attr = mutation.attributeName;
          // Ignore trivial attribute changes
          if (
            ![
              "class",
              "style",
              "data-loading",
              "aria-expanded",
              "aria-hidden",
            ].includes(attr)
          )
            continue;
          domChangeDetected = true;
          return;
        }
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "style",
        "data-loading",
        "aria-expanded",
        "aria-hidden",
      ],
    });
  }

  /**
   * Detect if a click was a "dead click" (no response)
   * @param {HTMLElement} element - The clicked element
   * @returns {Promise<boolean>} - True if dead click
   */
  async function detectDeadClick(element) {
    // Reset detection flag
    domChangeDetected = false;

    return new Promise((resolve) => {
      // Wait for potential DOM changes
      setTimeout(() => {
        // Check 1: DOM mutations
        if (domChangeDetected) {
          resolve(false);
          return;
        }

        // Check 2: Element has interactive behavior
        if (isInteractiveElement(element)) {
          // Links and form elements are expected to work
          const tag = element.tagName;
          if (tag === "A" && element.href) {
            resolve(false);
            return;
          }
          if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) {
            resolve(false);
            return;
          }
        }

        // Check 3: Click on non-interactive static element
        if (!isInteractiveElement(element)) {
          resolve(true);
          return;
        }

        // Check 4: Interactive element - if we got here, DOM didn't change
        // but it's an interactive element, so it likely did something non-visual
        resolve(false);
      }, 300); // 300ms delay to detect changes
    });
  }

  // ============================================
  // RRWEB SESSION RECORDING
  // ============================================
  let rrwebRecorder = null;
  let recordedEvents = [];
  let isRecording = false;
  const MAX_EVENTS_PER_BATCH = 100;
  const EVENT_FLUSH_INTERVAL = 5000;

  /**
   * Dynamically load a script
   * @param {string} src - Script URL
   * @returns {Promise}
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function initRRWebRecording() {
    // Dynamically load rrweb if not present
    if (typeof rrweb === "undefined") {
      try {
        console.log("[Navlens] Loading rrweb...");
        await loadScript(
          "https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js"
        );
      } catch (e) {
        console.warn(
          "[Navlens] Failed to load rrweb, session recording disabled"
        );
        return;
      }
    }

    if (isRecording) return;

    try {
      isRecording = true;
      rrwebRecorder = rrweb.record({
        emit(event) {
          // Scrub PII from events before storing
          const scrubbedEvent = scrubObjectPII(event);
          recordedEvents.push(scrubbedEvent);

          // Only schedule a throttled flush when hitting max batch size
          if (recordedEvents.length >= MAX_EVENTS_PER_BATCH) {
            scheduleThrottledFlush();
          }
        },
        sampling: {
          mousemove: 50,
          mouseInteraction: true,
          scroll: 150, // Reduced scroll sampling (was 100)
          input: "last",
        },
        blockClass: "navlens-block",
        ignoreClass: "navlens-ignore",
        maskTextClass: "navlens-mask",
        maskAllInputs: true,
      });

      // Periodic flush (every 10 seconds instead of 5)
      setInterval(flushRRWebEvents, EVENT_FLUSH_INTERVAL * 2);

      console.log("[Navlens] Session recording initialized");
    } catch (error) {
      console.error("[Navlens] Failed to initialize rrweb:", error);
      isRecording = false;
    }
  }

  // Throttled flush scheduling - prevents request flooding
  let flushScheduled = false;
  let isFlushingEvents = false;
  const MIN_FLUSH_INTERVAL = 5000; // Minimum 5 seconds between flushes

  function scheduleThrottledFlush() {
    if (flushScheduled || isFlushingEvents) return;
    flushScheduled = true;
    setTimeout(() => {
      flushScheduled = false;
      flushRRWebEvents();
    }, MIN_FLUSH_INTERVAL);
  }

  async function flushRRWebEvents() {
    // Prevent concurrent flushes
    if (isFlushingEvents || recordedEvents.length === 0) return;
    isFlushingEvents = true;

    const eventsToSend = recordedEvents.splice(0, recordedEvents.length);
    const deviceInfo = getDeviceInfo();

    const payload = {
      site_id: SITE_ID,
      session_id: SESSION_ID,
      visitor_id: VISITOR_ID,
      events: eventsToSend,
      timestamp: new Date().toISOString(),
      page_path: window.location.pathname,
      user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer,
      device_pixel_ratio: window.devicePixelRatio || 1,
      platform: navigator.platform,
      cookie_enabled: navigator.cookieEnabled,
      online: navigator.onLine,
      device_type: deviceInfo.device_type,
    };

    try {
      await sendCompressedFetch(RRWEB_EVENTS_ENDPOINT, payload);
    } catch (error) {
      console.error("[Navlens] Failed to send rrweb events:", error);
      // Re-add events to queue (but cap at 500 to prevent memory issues)
      const eventsToRestore = eventsToSend.slice(0, 500 - recordedEvents.length);
      recordedEvents.unshift(...eventsToRestore);
    } finally {
      isFlushingEvents = false;
    }
  }

  // ============================================
  // DOM SNAPSHOT CAPTURE
  // ============================================
  const VIEWPORT_CONFIGS = [
    { name: "mobile", width: 375, height: 667 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ];

  async function captureSnapshot(viewportConfig = null) {
    return scheduleTask(async () => {
      // Dynamically load rrweb-snapshot if not present (use window. for safer global check)
      if (typeof window.rrwebSnapshot === "undefined" || !window.rrwebSnapshot?.snapshot) {
        try {
          console.log("[Navlens] Loading rrweb-snapshot...");
          await loadScript(
            "https://cdn.jsdelivr.net/npm/rrweb-snapshot@latest/dist/rrweb-snapshot.min.js"
          );
        } catch (e) {
          console.warn("[Navlens] Failed to load rrweb-snapshot");
          return null;
        }
      }

      if (typeof window.rrwebSnapshot === "undefined" || !window.rrwebSnapshot?.snapshot) {
        console.warn("[Navlens] rrweb-snapshot still not loaded after attempt");
        return null;
      }

      try {
        const snapshot = window.rrwebSnapshot.snapshot(document);

        const snapshotData = {
          site_id: SITE_ID,
          page_path: window.location.pathname,
          device_type: viewportConfig ? viewportConfig.name : getDeviceType(),
          snapshot: scrubObjectPII(snapshot),
          width: viewportConfig ? viewportConfig.width : window.innerWidth,
          height: viewportConfig ? viewportConfig.height : window.innerHeight,
          origin: window.location.origin,
          timestamp: new Date().toISOString(),
        };

        return snapshotData;
      } catch (error) {
        console.error("[Navlens] Snapshot capture failed:", error);
        return null;
      }
    }, "normal");
  }

  async function captureSnapshotsForAllDevices() {
    const snapshots = [];

    for (const config of VIEWPORT_CONFIGS) {
      const snapshot = await scheduleTask(async () => {
        // Use current viewport for snapshot (use window. for safer global check)
        if (typeof window.rrwebSnapshot === "undefined" || !window.rrwebSnapshot?.snapshot) {
          return null;
        }

        try {
          const snapshotData = window.rrwebSnapshot.snapshot(document);
          return {
            site_id: SITE_ID,
            page_path: window.location.pathname,
            device_type: config.name,
            snapshot: scrubObjectPII(snapshotData),
            width: config.width,
            height: config.height,
            origin: window.location.origin,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          console.error(
            `[Navlens] Snapshot capture failed for ${config.name}:`,
            error
          );
          return null;
        }
      }, "idle");

      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  async function sendSnapshot(snapshotData) {
    if (!snapshotData) return;

    try {
      await sendCompressedFetch(DOM_SNAPSHOT_ENDPOINT, snapshotData);
      console.log("[Navlens] Snapshot sent successfully");
    } catch (error) {
      console.error("[Navlens] Failed to send snapshot:", error);
    }
  }

  // ============================================
  // SCROLL TRACKING
  // ============================================
  let maxScrollDepth = 0;
  let scrollDebounceTimer = null;

  function initScrollTracking() {
    const calculateScrollDepth = () => {
      const scrollTop = window.scrollY;
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const viewportHeight = window.innerHeight;
      const maxScroll = docHeight - viewportHeight;

      if (maxScroll <= 0) return 100;

      const depth = Math.round((scrollTop / maxScroll) * 100);
      return Math.min(Math.max(depth, 0), 100);
    };

    window.addEventListener(
      "scroll",
      () => {
        clearTimeout(scrollDebounceTimer);
        scrollDebounceTimer = setTimeout(() => {
          const currentDepth = calculateScrollDepth();
          if (currentDepth > maxScrollDepth) {
            maxScrollDepth = currentDepth;
          }
        }, 100);
      },
      { passive: true }
    );
  }
  // ============================================
  // CLICK TRACKING
  // ============================================
  function handleClick(event) {
    const element = event.target;
    if (!element) return;

    // Skip tracking elements
    if (element.closest("[data-navlens-ignore]")) return;

    // Update session activity
    updateSessionActivity();

    const position = getElementPosition(element);
    const selector = generateElementSelector(element);
    const docDimensions = getDocumentDimensions();

    // Calculate absolute page coordinates
    const pageX = Math.round(event.pageX);
    const pageY = Math.round(event.pageY);

    // Calculate relative coordinates for heatmap normalization (0-1 range)
    const xRelative =
      docDimensions.width > 0
        ? parseFloat((pageX / docDimensions.width).toFixed(4))
        : 0;
    const yRelative =
      docDimensions.height > 0
        ? parseFloat((pageY / docDimensions.height).toFixed(4))
        : 0;

    // Get element text with PII scrubbing
    let elementText = element.innerText || element.textContent || "";
    elementText = scrubPII(elementText.substring(0, 100).trim());

    const clickData = {
      event_type: "click",
      event_id: generateEventId(),
      session_id: SESSION_ID,
      // Note: API key is sent via x-api-key header, not in body
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_path: window.location.pathname,

      // Element info
      element_selector: selector,
      element_tag: element.tagName.toLowerCase(),
      element_id: element.id || null,
      element_class:
        typeof element.className === "string" ? element.className : null,
      element_text: elementText,
      element_href: element.href || element.closest("a")?.href || null,

      // Coordinates - absolute
      x: pageX,
      y: pageY,
      click_x: Math.round(event.clientX),
      click_y: Math.round(event.clientY),
      page_x: pageX,
      page_y: pageY,

      // Coordinates - relative (for heatmap normalization)
      x_relative: xRelative,
      y_relative: yRelative,

      // Document dimensions
      document_width: docDimensions.width,
      document_height: docDimensions.height,

      // Element position
      element_position: position,

      // Metadata
      is_interactive: isInteractiveElement(element),
      is_dead_click: false, // Will be updated if dead click detected
      scroll_depth: maxScrollDepth,
      device_info: getDeviceInfo(),
    };

    // Send click data IMMEDIATELY using sendBeacon for reliability
    // This ensures the click is recorded even if user navigates away
    sendWrappedBeacon(V1_INGEST_ENDPOINT, clickData);

    // Detect dead click asynchronously and send as separate event if needed
    detectDeadClick(element).then((isDeadClick) => {
      if (isDeadClick) {
        const deadClickData = {
          event_type: "dead_click",
          event_id: generateEventId(),
          session_id: SESSION_ID,
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          page_path: window.location.pathname,
          element_selector: selector,
          element_tag: element.tagName?.toLowerCase() || "",
          x: pageX,
          y: pageY,
          x_relative: xRelative,
          y_relative: yRelative,
          document_width: docDimensions.width,
          document_height: docDimensions.height,
          device_info: getDeviceInfo(),
        };
        sendWrappedFetch(V1_INGEST_ENDPOINT, deadClickData).catch(console.error);
      }
    });
  }

  // ============================================
  // PAGE VIEW TRACKING
  // ============================================
  function trackPageView() {
    const pageViewData = {
      event_type: "page_view",
      event_id: generateEventId(),
      session_id: SESSION_ID,
      // Note: API key is sent via x-api-key header, not in body
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer || null,
      device_info: getDeviceInfo(),
    };

    // Use sendBeacon with wrapped format for reliable delivery
    sendWrappedBeacon(V1_INGEST_ENDPOINT, pageViewData);
  }

  // ============================================
  // RAGE CLICK DETECTION
  // ============================================
  const clickHistory = [];
  const RAGE_CLICK_THRESHOLD = 3;
  const RAGE_CLICK_WINDOW = 1000;
  const RAGE_CLICK_RADIUS = 50;

  function detectRageClick(event) {
    const now = Date.now();
    const x = event.clientX;
    const y = event.clientY;

    // Bound history size to prevent memory leak
    if (clickHistory.length > 100) {
      clickHistory.splice(0, clickHistory.length - 100);
    }

    // Add current click
    clickHistory.push({ x, y, time: now });

    // Remove old clicks
    while (
      clickHistory.length > 0 &&
      now - clickHistory[0].time > RAGE_CLICK_WINDOW
    ) {
      clickHistory.shift();
    }

    // Check for rage clicks
    if (clickHistory.length >= RAGE_CLICK_THRESHOLD) {
      const recentClicks = clickHistory.slice(-RAGE_CLICK_THRESHOLD);
      const avgX =
        recentClicks.reduce((sum, c) => sum + c.x, 0) / recentClicks.length;
      const avgY =
        recentClicks.reduce((sum, c) => sum + c.y, 0) / recentClicks.length;

      const isRageClick = recentClicks.every((c) => {
        const distance = Math.sqrt(
          Math.pow(c.x - avgX, 2) + Math.pow(c.y - avgY, 2)
        );
        return distance < RAGE_CLICK_RADIUS;
      });

      if (isRageClick) {
        console.log("[Navlens] Rage click detected!");
        sendRageClickEvent(event, recentClicks.length);
        clickHistory.length = 0; // Reset
      }
    }
  }

  function sendRageClickEvent(event, clickCount) {
    const element = event.target;
    const position = getElementPosition(element);
    const selector = generateElementSelector(element);
    const docDimensions = getDocumentDimensions();
    const pageX = Math.round(event.pageX);
    const pageY = Math.round(event.pageY);

    const rageClickData = {
      event_type: "rage_click",
      event_id: generateEventId(),
      session_id: SESSION_ID,
      // Note: API key is sent via x-api-key header, not in body
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_path: window.location.pathname,
      element_selector: selector,
      element_tag: element.tagName.toLowerCase(),
      click_count: clickCount,
      x: pageX,
      y: pageY,
      click_x: Math.round(event.clientX),
      click_y: Math.round(event.clientY),
      x_relative:
        docDimensions.width > 0
          ? parseFloat((pageX / docDimensions.width).toFixed(4))
          : 0,
      y_relative:
        docDimensions.height > 0
          ? parseFloat((pageY / docDimensions.height).toFixed(4))
          : 0,
      document_width: docDimensions.width,
      document_height: docDimensions.height,
      element_position: position,
      device_info: getDeviceInfo(),
    };

    sendWrappedFetch(V1_INGEST_ENDPOINT, rageClickData).catch(console.error);
  }

  // ============================================
  // VISIBILITY CHANGE TRACKING
  // ============================================
  let visibilityStartTime = Date.now();
  let totalVisibleTime = 0;

  function initVisibilityTracking() {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        // Page became hidden - calculate visible time
        totalVisibleTime += Date.now() - visibilityStartTime;

        // Send visibility event using wrapped format
        const visibilityData = {
          event_type: "visibility_hidden",
          event_id: generateEventId(),
          session_id: SESSION_ID,
          // Note: API key is sent via x-api-key header, not in body
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          page_path: window.location.pathname,
          visible_time_ms: Date.now() - visibilityStartTime,
          total_visible_time_ms: totalVisibleTime,
          scroll_depth: maxScrollDepth,
          device_info: getDeviceInfo(),
        };

        sendWrappedBeacon(V1_INGEST_ENDPOINT, visibilityData);
      } else {
        // Page became visible again
        visibilityStartTime = Date.now();
        updateSessionActivity();
      }
    });
  }

  // ============================================
  // UNLOAD HANDLING
  // ============================================
  function handleUnload() {
    // Calculate final visible time
    if (document.visibilityState === "visible") {
      totalVisibleTime += Date.now() - visibilityStartTime;
    }

    // Flush remaining rrweb events
    if (recordedEvents.length > 0) {
      const deviceInfo = getDeviceInfo();
      const payload = {
        site_id: SITE_ID,  // Required by backend
        session_id: SESSION_ID,
        visitor_id: VISITOR_ID,  // Required by backend
        events: recordedEvents,
        timestamp: new Date().toISOString(),
        page_path: window.location.pathname,
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        referrer: document.referrer,
        device_type: deviceInfo.device_type,
      };

      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      navigator.sendBeacon(RRWEB_EVENTS_ENDPOINT, blob);
    }

    // Send session end event using wrapped format
    const sessionEndData = {
      event_type: "session_end",
      event_id: generateEventId(),
      session_id: SESSION_ID,
      // Note: API key is sent via x-api-key header, not in body
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_path: window.location.pathname,
      max_scroll_depth: maxScrollDepth,
      total_visible_time_ms: totalVisibleTime,
      device_info: getDeviceInfo(),
    };

    sendWrappedBeacon(V1_INGEST_ENDPOINT, sessionEndData);

    // Stop DOM hash monitoring
    if (domHashCheckTimer) {
      clearInterval(domHashCheckTimer);
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    if (!API_KEY) {
      console.error(
        "[Navlens] No API key provided. Add data-api-key attribute to the script tag."
      );
      return;
    }

    console.log("[Navlens] Initializing tracker v5.2 (Enterprise Edition)");

    // Initialize mutation observer for dead click detection
    initMutationObserver();

    // Initialize scroll tracking
    initScrollTracking();

    // Initialize visibility tracking
    initVisibilityTracking();

    // Track initial page view
    trackPageView();

    // Click event listeners
    document.addEventListener(
      "click",
      (e) => {
        handleClick(e);
        detectRageClick(e);
      },
      { passive: true }
    );

    // Initialize session recording
    scheduleTask(() => {
      initRRWebRecording();
    }, "idle");

    // Capture initial snapshot and start DOM monitoring
    scheduleTask(async () => {
      const snapshot = await captureSnapshot();
      if (snapshot) {
        snapshot.hash = generateDomHash();  // Backend expects 'hash' not 'dom_hash'
        sendSnapshot(snapshot);
      }
      // Start DOM hash monitoring after initial snapshot
      startDomHashMonitoring();
    }, "idle");

    // Handle page unload
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);

    // Handle SPA navigation
    if (typeof window.history !== "undefined") {
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function () {
        originalPushState.apply(this, arguments);
        trackPageView();
        // Reset scroll depth and check DOM changes for new page
        maxScrollDepth = 0;
        setTimeout(checkDomChanges, 500);
      };

      history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        trackPageView();
      };

      window.addEventListener("popstate", () => {
        trackPageView();
        maxScrollDepth = 0;
        setTimeout(checkDomChanges, 500);
      });
    }

    console.log("[Navlens] Tracker initialized successfully");
    console.log(
      "[Navlens] Features: Time-Slicing ✓ | Compression ✓ | PII Scrubbing ✓ | Dead Click ✓ | DOM Hash ✓ | Retry Queue ✓ | Debug Capture ✓"
    );
  }

  // ============================================
  // PUBLIC API
  // ============================================
  window.Navlens = {
    version: "6.0.0",
    sessionId: SESSION_ID,

    // Manual tracking methods
    track: (eventName, properties = {}) => {
      const eventData = {
        event_type: "custom",
        event_name: eventName,
        event_id: generateEventId(),
        session_id: SESSION_ID,
        // Note: API key is sent via x-api-key header, not in body
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        page_path: window.location.pathname,
        properties: scrubObjectPII(properties),
        device_info: getDeviceInfo(),
      };

      sendWrappedFetch(V1_INGEST_ENDPOINT, eventData).catch(console.error);
    },

    // Identify user (PII-safe)
    identify: (userId, traits = {}) => {
      const identifyData = {
        event_type: "identify",
        event_id: generateEventId(),
        session_id: SESSION_ID,
        // Note: API key is sent via x-api-key header, not in body
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        page_path: window.location.pathname,
        user_id: scrubPII(String(userId)),
        traits: scrubObjectPII(traits),
        device_info: getDeviceInfo(),
      };

      sendWrappedFetch(V1_INGEST_ENDPOINT, identifyData).catch(console.error);
    },

    // Manual snapshot capture
    captureSnapshot: async () => {
      const snapshot = await captureSnapshot();
      if (snapshot) {
        snapshot.hash = generateDomHash();  // Backend expects 'hash' not 'dom_hash'
        await sendSnapshot(snapshot);
      }
      return snapshot;
    },

    // Get current session info
    getSession: () => ({
      sessionId: SESSION_ID,
      scrollDepth: maxScrollDepth,
      isRecording,
      totalVisibleTime,
      domHash: lastDomHash,
    }),

    // Refresh session (useful after login)
    refreshSession: () => {
      SESSION_ID = generateSessionId();
      const newSession = {
        id: SESSION_ID,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      window.Navlens.sessionId = SESSION_ID;
      return SESSION_ID;
    },

    // Force DOM hash check
    checkDomChanges: () => {
      checkDomChanges();
    },

    // Get current DOM hash
    getDomHash: () => generateDomHash(),

    // PII scrubbing utilities
    scrubPII,
    scrubObjectPII,
  };

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
