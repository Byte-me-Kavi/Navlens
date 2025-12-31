(function () {
  "use strict";
  // ANTI-FLICKER: Hide content immediately
  const ANTI_FLICKER_ID = 'navlens-anti-flicker';
  const HIDE_TIMEOUT = 500; // Strict 500ms limit
  
  try {
    if (!document.getElementById(ANTI_FLICKER_ID)) {
      const style = document.createElement('style');
      style.id = ANTI_FLICKER_ID;
      style.textContent = 'html { visibility: hidden !important; opacity: 0 !important; }';
      document.head.appendChild(style);
      
      // Safety timeout - hard limit to prevent indefinite hiding
      setTimeout(() => {
        const style = document.getElementById(ANTI_FLICKER_ID);
        if (style) {
          style.remove();
          console.warn('[Navlens] Anti-flicker timed out - showing content');
        }
      }, HIDE_TIMEOUT);
    }
  } catch (_e) {}

  const DEBUG = false; // Set to true for verbose logging
  const script = document.currentScript;
  const API_KEY = script?.dataset?.apiKey || "";
  const SITE_ID = script?.dataset?.siteId || "";
  const API_HOST = script?.dataset?.apiHost || "https://navlens-rho.vercel.app";


  const IS_EDITOR_MODE = new URLSearchParams(window.location.search).has('__navlens_editor');
  
  if (IS_EDITOR_MODE) {
    console.log('[Navlens] Editor mode detected - tracking disabled');
  }

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
  const EVENTS_ENDPOINT = V1_INGEST_ENDPOINT; // Alias for goal tracking
  const RRWEB_EVENTS_ENDPOINT = `${normalizedHost}/api/rrweb-events`;
  const DOM_SNAPSHOT_ENDPOINT = `${normalizedHost}/api/dom-snapshot`;
  const DEBUG_EVENTS_ENDPOINT = `${normalizedHost}/api/v1/debug-events`;
  const FORM_EVENTS_ENDPOINT = `${normalizedHost}/api/v1/form-events`;
  const FEEDBACK_ENDPOINT = `${normalizedHost}/api/feedback`;
  const FEEDBACK_CONFIG_ENDPOINT = `${normalizedHost}/api/feedback-config`;
  
  
  // New: Unified batch endpoint (reduces network requests)
  const BATCH_ENDPOINT = `${normalizedHost}/api/v1/batch`;
  const TRACKER_CONFIG_ENDPOINT = `${normalizedHost}/api/tracker-config`;
  
  // Batch mode flag - will be set to false if batch endpoint fails
  let useBatchMode = true;
  
  // PARALLEL FETCH: Start config fetch immediately to maximize network time
  // This runs before other script logic to give network request a head start
  let _earlyConfigPromise = null;
  try {
    const _script = document.currentScript;
    const _siteId = _script?.dataset?.siteId || '';
    const _apiHost = _script?.dataset?.apiHost || 'https://navlens-rho.vercel.app';
    const _normalizedHost = _apiHost.includes('://') ? _apiHost : `https://${_apiHost}`;
    if (_siteId) {
      _earlyConfigPromise = fetch(`${_normalizedHost}/api/tracker-config?siteId=${_siteId}`, {
        priority: 'high',
        cache: 'default'
      }).then(r => r.ok ? r.json() : null).catch(() => null);
    }
  } catch (_e) {}


  
  // DEBUG defined at top of file
  let experimentAssignments = {};
  let experimentConfig = null;

  let experimentObserver = null;

  /**
   * FNV-1a hash for deterministic bucketing (edge-compatible)
   */
  function fnv1aHash(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /**
   * Get bucket for visitor based on variant weights
   */
  function getBucketForVisitor(visitorId, experimentId, variants) {
    const key = `${visitorId}-${experimentId}`;
    const hash = fnv1aHash(key);
    const normalized = hash / 4294967296; // 0.0 to 1.0
    
    // Calculate total weight
    let totalWeight = 0;
    for (let i = 0; i < variants.length; i++) {
      totalWeight += (variants[i].weight !== undefined ? variants[i].weight : 50);
    }
    
    // Fallback if weights invalid logic
    if (totalWeight <= 0) return hash % variants.length;

    let random = normalized * totalWeight;
    let accumulated = 0;
    
    for (let i = 0; i < variants.length; i++) {
      accumulated += (variants[i].weight !== undefined ? variants[i].weight : 50);
      if (random < accumulated) {
        return i;
      }
    }
    
    return variants.length - 1;
  }

  /**
   * Load experiment config from API (works with private storage)
   * Tries merged tracker-config endpoint first, falls back to individual
   */
  let cachedFeedbackConfig = null; // Shared with feedback widget
  
  async function loadExperimentConfig() {
    try {
      // Try merged endpoint first (gets experiments + feedback in one request)
      const resp = await fetch(`${TRACKER_CONFIG_ENDPOINT}?siteId=${SITE_ID}`, {
        priority: 'high',
        cache: 'default'
      });
      if (resp.ok) {
        const config = await resp.json();
        // Cache feedback config for later use
        if (config.feedback) {
          cachedFeedbackConfig = config.feedback;
          console.log('[Navlens] Merged config loaded (experiments + feedback)');
        }
        return config;
      }
    } catch (_e) {
      console.warn('[navlens] Merged config failed, trying individual:', e.message);
    }
    
    // Fallback to individual experiment config endpoint
    try {
      const resp = await fetch(`${normalizedHost}/api/experiments/config?siteId=${SITE_ID}`, {
        priority: 'high',
        cache: 'default'
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch (_e) {
      console.warn('[navlens] Config fetch failed:', e);
      return null;
    }
  }

  /**
   * Apply a single modification to an element
   * Supports all 18 modification types
   */
  function applyModification(element, mod) {
    if (element.dataset.nvApplied === mod.id) return;
    
    const changes = mod.changes || {};
    
    try {
      switch (mod.type) {

        case 'css':
          if (changes.css) {
            Object.assign(element.style, changes.css);
          }
          break;
          
        case 'text':
          if (changes.text !== undefined) {
            element.textContent = changes.text;
          }
          break;
          
        case 'hide':
          element.style.display = 'none';
          break;
          
        case 'remove':
          element.remove();
          break;
          
        case 'clone':
          const cloneCount = changes.cloneCount || 1;
          const clonePos = changes.clonePosition || 'after';
          for (let i = 0; i < cloneCount; i++) {
            const cloned = element.cloneNode(true);
            cloned.removeAttribute('id');
            cloned.removeAttribute('data-nv-applied');
            if (clonePos === 'before') {
              element.parentNode.insertBefore(cloned, element);
            } else {
              element.parentNode.insertBefore(cloned, element.nextSibling);
            }
          }
          break;
          
        case 'image':
          if (changes.imageUrl) {
            // Robust image replacement for Next.js
            const replaceImage = (img) => {
              // Skip if already modified with this URL
              if (img.dataset.nvImgUrl === changes.imageUrl) return;
              
              // Clear srcset to prevent Next.js from overriding
              img.removeAttribute('srcset');
              img.removeAttribute('data-srcset');
              
              // Set the new src
              img.src = changes.imageUrl;
              
              // Use CSS content to ensure image stays replaced even if React re-renders
              img.style.cssText += `content: url(${changes.imageUrl}) !important; object-fit: cover !important;`;
              
              // Mark with the URL to prevent re-application loops
              img.dataset.nvImgUrl = changes.imageUrl;
            };
            
            if (element.tagName === 'IMG') {
              replaceImage(element);
            } else {
              element.querySelectorAll('img').forEach(replaceImage);
            }
          }
          break;
          
        case 'link':
          if (element.tagName === 'A') {
            if (changes.linkUrl) element.href = changes.linkUrl;
            if (changes.linkTarget) element.target = changes.linkTarget;
          }
          break;
          
        case 'insertHtml':
          if (changes.html) {
            const sanitizedHtml = changes.html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            const pos = changes.insertPosition || 'after';
            element.insertAdjacentHTML(
              pos === 'before' ? 'beforebegin' : 
              pos === 'after' ? 'afterend' :
              pos === 'prepend' ? 'afterbegin' : 'beforeend',
              sanitizedHtml
            );
          }
          break;
          
        case 'replaceHtml':
          if (changes.html) {
            const sanitizedHtml = changes.html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            element.outerHTML = sanitizedHtml;
          }
          break;
          

        case 'resize':
          if (changes.width) element.style.width = changes.width;
          if (changes.height) element.style.height = changes.height;
          break;
          
        case 'dragMove':
          // Replay drag-and-drop move
          if (changes.targetSelector && changes.position) {
            try {
              const target = document.querySelector(changes.targetSelector);
              if (target && target.parentNode) {
                if (changes.position === 'before') {
                  target.parentNode.insertBefore(element, target);
                } else {
                  target.parentNode.insertBefore(element, target.nextSibling);
                }
              }
            } catch (_e) {
              console.warn('[navlens] Failed to replay dragMove:', e);
            }
          }
          break;
          
        case 'reorder':
          if (typeof changes.newIndex === 'number') {
            const parent = element.parentNode;
            const siblings = Array.from(parent.children);
            const newIdx = Math.min(changes.newIndex, siblings.length - 1);
            const targetSibling = siblings[newIdx];
            if (targetSibling && targetSibling !== element) {
              parent.insertBefore(element, targetSibling);
            }
          }
          break;
          
        case 'move':
          if (changes.position) {
            element.style.transform = `translate(${changes.position.x || 0}px, ${changes.position.y || 0}px)`;
          }
          break;
          

        case 'attribute':
          if (changes.attributes) {
            Object.entries(changes.attributes).forEach(([attr, value]) => {
              // Block event handlers for security
              if (!attr.toLowerCase().startsWith('on')) {
                element.setAttribute(attr, value);
              }
            });
          }
          break;
          
        case 'class':
          if (changes.addClass && Array.isArray(changes.addClass)) {
            changes.addClass.forEach(c => {
              if (c && typeof c === 'string') element.classList.add(c);
            });
          }
          if (changes.removeClass && Array.isArray(changes.removeClass)) {
            changes.removeClass.forEach(c => {
              if (c && typeof c === 'string') element.classList.remove(c);
            });
          }
          break;
          

        case 'clickRedirect':
          if (changes.redirectUrl) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', function nvClickRedirect(e) {
              e.preventDefault();
              e.stopPropagation();
              window.location.href = changes.redirectUrl;
            }, { once: false });
          }
          break;
          
        case 'tooltip':
          if (changes.tooltipText) {
            element.title = changes.tooltipText;
          }
          break;
          
        case 'sticky':
          element.style.position = 'sticky';
          element.style.top = changes.stickyTop || '0px';
          element.style.zIndex = changes.stickyZIndex || 1000;
          break;
          

        case 'placeholder':
          if (changes.placeholderText !== undefined && 
              (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
            element.placeholder = changes.placeholderText;
          }
          break;
          
        case 'formAction':
          if (changes.formActionUrl && element.tagName === 'FORM') {
            element.action = changes.formActionUrl;
          }
          break;
          

        case 'animation':
          if (changes.animationName) {
            const duration = changes.animationDuration || '0.5s';
            
            // Inject keyframes if not already present
            if (!document.getElementById('nv-animation-styles')) {
              const animStyles = document.createElement('style');
              animStyles.id = 'nv-animation-styles';
              animStyles.textContent = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideInUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes slideInDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-20px); } 60% { transform: translateY(-10px); } }
                @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
              `;
              document.head.appendChild(animStyles);
            }
            
            if (changes.animationName === 'custom' && changes.animationCustom) {
              element.style.transition = `all ${duration}`;
              // Parse custom CSS
              changes.animationCustom.split(';').forEach(part => {
                const [prop, value] = part.split(':').map(s => s.trim());
                if (prop && value) {
                  const camelProp = prop.replace(/-([a-z])/g, g => g[1].toUpperCase());
                  element.style[camelProp] = value;
                }
              });
            } else {
              const iteration = changes.animationIteration || '1';
              const delay = changes.animationDelay || '0s';
              element.style.animation = `${changes.animationName} ${duration} ${delay} ${iteration}`;
            }
          }
          break;
          
        // Legacy support
        case 'html':
          if (changes.html) {
            element.innerHTML = changes.html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          }
          break;
      }
      
      element.dataset.nvApplied = mod.id;
    } catch (_e) {
      console.warn('[navlens] Failed to apply modification:', mod.type, e);
    }
  }

  /**
   * Wait for React/framework hydration to complete
   * Uses multiple signals: DOMContentLoaded + requestAnimationFrame + microtask
   * This ensures React has finished hydrating before we modify the DOM
   */
  function waitForHydration() {
    return new Promise(resolve => {
      // If document is already loaded, use RAF + microtask to wait for React
      const afterDomReady = () => {
        // requestAnimationFrame ensures the next paint cycle
        requestAnimationFrame(() => {
          // queueMicrotask ensures React's commit phase is complete
          queueMicrotask(() => {
            // Small additional delay for React concurrent mode
            setTimeout(resolve, 50);
          });
        });
      };
      
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        afterDomReady();
      } else {
        document.addEventListener('DOMContentLoaded', afterDomReady, { once: true });
      }
    });
  }

  /**
   * Start MutationObserver engine for instant DOM changes
   * Waits for framework hydration before applying modifications to avoid hydration mismatch
   */
  function startExperimentEngine(modifications) {
    if (!modifications?.length) return;
    
    // Helper to escape selectors with special characters (Tailwind responsive prefixes like md:)
    function escapeSelector(selector) {
      // Escape colons that are part of class names (Tailwind responsive prefixes)
      // But don't escape pseudo-selectors like :hover, :first-child which start with :
      return selector.replace(/\.([a-z0-9-]+):([a-z0-9-]+)/gi, '.$1\\:$2');
    }
    
    // Function to apply modifications to DOM
    function applyAllModifications() {
      modifications.forEach(mod => {
        try {
          const escapedSelector = escapeSelector(mod.selector);
          const elements = document.querySelectorAll(escapedSelector);
          elements.forEach(el => applyModification(el, mod));
        } catch (_e) {
          console.warn('[navlens] Invalid selector:', mod.selector, e);
        }
      });
    }
    
    // Function to start mutation observer for SPA/dynamic content
    function startObserver() {
      if (experimentObserver) {
        experimentObserver.disconnect();
      }
      
      experimentObserver = new MutationObserver(() => {
        modifications.forEach(mod => {
          try {
            const escapedSelector = escapeSelector(mod.selector);
            const elements = document.querySelectorAll(escapedSelector);
            elements.forEach(el => {
              if (el.dataset.nvApplied !== mod.id) {
                applyModification(el, mod);
              }
            });
          } catch (_e) {
            // Invalid selector, skip
          }
        });
      });
      
      experimentObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
    
    // Wait for hydration before applying modifications to avoid React hydration mismatch
    waitForHydration().then(() => {
      applyAllModifications();
      startObserver();
    });
  }

  /**
   * Bucket user and get modifications for their variants
   */
  function processExperiments(config, visitorId) {
    if (!config?.experiments?.length) return [];
    
    const allModifications = [];
    
    config.experiments.forEach(exp => {
      const variants = exp.v || [];
      if (!variants.length) return;
      
      // Check traffic percentage
      const trafficThreshold = (exp.t || 100) / 100;
      const trafficHash = fnv1aHash(`${visitorId}-${exp.id}-traffic`) / 0xFFFFFFFF;
      if (trafficHash > trafficThreshold) return; // User not in experiment
      
      // Bucket user into variant
      const bucket = getBucketForVisitor(visitorId, exp.id, variants);
      const assignedVariant = variants[bucket];
      
      if (assignedVariant) {
        experimentAssignments[exp.id] = assignedVariant.id;
        
        // Get modifications for this variant
        const mods = (exp.m || []).filter(m => m.variant_id === assignedVariant.id);
        allModifications.push(...mods);
      }
    });
    
    // Update window object for other scripts
    window.__NAVLENS_EXPERIMENTS = { ...experimentAssignments };
    
    // Persist assignments to cookie for page reloads
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString(); // 30 days
    document.cookie = `navlens_exp=${encodeURIComponent(JSON.stringify(experimentAssignments))}; expires=${expires}; path=/; SameSite=Lax`;
    
    return allModifications;
  }

  /**
   * Initialize experiment engine with anti-flicker
   */
  async function initExperiments() {
    const start = performance.now();
    
    // Get visitor ID from cookie or generate new one
    let visitorId = document.cookie.match(/navlens_visitor=([^;]+)/)?.[1];
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substr(2, 9);
      // CRITICAL: Save visitor ID to cookie for persistent assignment
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `navlens_visitor=${visitorId}; expires=${expires}; path=/; SameSite=Lax`;
    }
    
    // Also restore previous experiment assignments from cookie (for consistency)
    const savedAssignments = document.cookie.match(/navlens_exp=([^;]+)/)?.[1];
    if (savedAssignments) {
      try {
        Object.assign(experimentAssignments, JSON.parse(decodeURIComponent(savedAssignments)));
      } catch (_e) { /* ignore parse errors */ }
    }
    
    // Load config: STALE-WHILE-REVALIDATE - Use cache immediately, refresh in background
    let config = null;
    let needsRefresh = false;
    try {
      const cached = localStorage.getItem('navlens_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Use cache immediately if it has feedback (new merged format) - regardless of age
        if (parsed.data?.feedback) {
          config = parsed.data;
          cachedFeedbackConfig = config.feedback;
          // Mark for background refresh if stale (> 5 min old)
          needsRefresh = Date.now() - parsed.timestamp > 300000;
          console.log('[Navlens] Using cached config (stale-while-revalidate)');
        } else if (parsed.data && !parsed.data.feedback) {
          // Old format cache - clear it
          localStorage.removeItem('navlens_config');
        }
      }
    } catch (_e) { /* ignore */ }

    // If no valid cache, fetch from network with STRICT 500ms timeout
    if (!config) {
      // Reuse early fetch if available, otherwise start new one
      const configPromise = _earlyConfigPromise || loadExperimentConfig();
      
      config = await Promise.race([
        configPromise.then(c => {
          if (c) {
            try {
              localStorage.setItem('navlens_config', JSON.stringify({
                data: c,
                timestamp: Date.now()
              }));
              // Cache feedback config
              if (c.feedback) cachedFeedbackConfig = c.feedback;
            } catch (_e) {}
          }
          return c;
        }),
        new Promise(r => setTimeout(() => r(null), 500)) // STRICT 500ms limit
      ]);
    } else if (needsRefresh) {
      // Stale cache - refresh in background (don't block)
      loadExperimentConfig().then(c => {
        if (c) {
          try {
            localStorage.setItem('navlens_config', JSON.stringify({
              data: c,
              timestamp: Date.now()
            }));
          } catch (_e) {}
        }
      });
    }
    
    if (config) {
      experimentConfig = config;
      const modifications = processExperiments(config, visitorId);
      
      if (modifications.length) {
        startExperimentEngine(modifications);
      }
      
      // Trigger pageview goal evaluation after experiments are loaded
      // Small delay to ensure all assignments are set
      setTimeout(() => {
        evaluateExperimentGoals('pageview', { 
          url: window.location.href, 
          path: window.location.pathname 
        });
        if (DEBUG) {
          console.log(`[navlens] Pageview goal check triggered for ${window.location.pathname}`);
        }
      }, 100);
    }
    
    // Release anti-flicker (regardless of success/fail to ensure site shows)
    const antiFlicker = document.getElementById(ANTI_FLICKER_ID);
    if (antiFlicker) {
      antiFlicker.remove();
    }
    // Legacy fallback
    if (document.documentElement.style.visibility === 'hidden') {
      document.documentElement.style.visibility = '';
    }
    
    const elapsed = performance.now() - start;
    if (elapsed > 100) {
      console.log(`[navlens] Experiments loaded in ${elapsed.toFixed(0)}ms`);
    }
  }

  /**
   * Get active experiment assignments
   */
  function getActiveExperiments() {
    if (window.__NAVLENS_EXPERIMENTS && typeof window.__NAVLENS_EXPERIMENTS === 'object') {
      experimentAssignments = { ...experimentAssignments, ...window.__NAVLENS_EXPERIMENTS };
    }
    return experimentAssignments;
  }

  /**
   * Set experiment assignment manually
   */
  function setExperimentAssignment(experimentId, variantId) {
    experimentAssignments[experimentId] = variantId;
    window.__NAVLENS_EXPERIMENTS = { ...getActiveExperiments() };
  }


  
  // Cache for tracked goals (prevent duplicates)
  const trackedGoals = new Set();
  
  /**
   * Match URL against pattern with specified match type
   */
  function matchUrl(url, pattern, matchType) {
    if (!pattern) return true;
    
    // Normalize: remove query params/hash, then trailing slash
    const cleanUrl = url.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
    const cleanPattern = pattern.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
    
    // Extract path from full URL for path-only comparisons
    let path = cleanUrl;
    try {
      if (cleanUrl.startsWith('http')) {
        path = new URL(cleanUrl).pathname.replace(/\/$/, '') || '/';
      }
    } catch (_e) {
      // Fallback if URL parsing fails (e.g. relative path)
      path = cleanUrl.replace(/^https?:\/\/[^\/]+/, '').replace(/\/$/, '') || '/';
    }

    switch (matchType) {
      case 'exact':
        return path === cleanPattern || cleanUrl === cleanPattern;
      case 'contains':
        return path.includes(pattern) || cleanUrl.includes(pattern);
      case 'regex':
        try {
          return new RegExp(pattern).test(path) || new RegExp(pattern).test(url);
        } catch {
          return false;
        }
      default: // default to contains
        return path.includes(pattern);
    }
  }
  
  /**
   * Evaluate if a goal is achieved based on event data
   */
  function evaluateGoal(goal, eventType, eventData) {
    if (DEBUG) {
      console.log(`[navlens] Evaluating goal: ${goal.name} (${goal.type}) against event: ${eventType}`);
    }
    
    switch (goal.type) {
      case 'click':
        if (eventType !== 'click') return false;
        if (goal.selector && eventData.element) {
          try {
            // Check if clicked element matches selector
            return eventData.element.matches(goal.selector) || 
                   eventData.element.closest(goal.selector) !== null;
          } catch { return false; }
        }
        if (goal.url_pattern) {
          return matchUrl(window.location.href, goal.url_pattern, goal.url_match || 'contains');
        }
        return !goal.selector; // No selector = any click on matching URL
        
      case 'pageview':
        if (eventType !== 'pageview') return false;
        const pageviewMatch = matchUrl(window.location.href, goal.url_pattern, goal.url_match || 'contains');
        if (DEBUG) {
          console.log(`[navlens] Pageview goal: pattern="${goal.url_pattern}" match="${goal.url_match}" url="${window.location.pathname}" result=${pageviewMatch}`);
        }
        return pageviewMatch;
        
      case 'form_submit':
        if (eventType !== 'form_submit' && eventType !== 'submit') return false;
        if (goal.selector && eventData.element) {
          try {
            return eventData.element.matches(goal.selector) ||
                   eventData.element.closest(goal.selector) !== null;
          } catch { return false; }
        }
        return true;
        
      case 'custom_event':
        return eventType === goal.event_name;
        
      case 'scroll_depth':
        if (eventType !== 'scroll_depth') return false;
        const threshold = goal.depth_percentage || 50;
        return (eventData.depth || 0) >= threshold;
        
      case 'time_on_page':
        if (eventType !== 'time_threshold') return false;
        const minSeconds = goal.seconds || 30;
        return (eventData.seconds || 0) >= minSeconds;
        
      case 'revenue':
        if (eventType !== goal.event_name) return false;
        return true; // Revenue is tracked, value extracted separately
        
      default:
        return false;
    }
  }
  
  /**
   * Track a goal conversion for an experiment
   */
  function trackGoalConversion(experimentId, variantId, goal, eventData) {
    // Create unique key to prevent duplicate tracking
    const goalKey = `${experimentId}:${goal.id}`;
    if (trackedGoals.has(goalKey)) return;
    trackedGoals.add(goalKey);
    
    // Build conversion event
    const conversionEvent = {
      event_type: 'experiment_goal',
      experiment_id: experimentId,
      variant_id: variantId,
      goal_id: goal.id,
      goal_type: goal.type,
      goal_name: goal.name,
      is_primary: goal.is_primary,
      timestamp: Date.now(),
      page_path: window.location.pathname,
    };
    
    // Add revenue data if applicable
    if (goal.type === 'revenue' && goal.track_value && goal.value_field) {
      const value = eventData.properties?.[goal.value_field] || eventData[goal.value_field];
      if (typeof value === 'number') {
        conversionEvent.revenue_value = value;
        conversionEvent.currency = goal.currency || 'USD';
      }
    }
    
    // Send via existing beacon system
    sendWrappedBeacon(EVENTS_ENDPOINT, conversionEvent);
    
    if (DEBUG) {
      console.log(`[navlens] Goal tracked: ${goal.name} (${goal.type}) for experiment ${experimentId}`);
    }
  }
  
  /**
   * Evaluate all goals for active experiments
   */
  function evaluateExperimentGoals(eventType, eventData) {
    if (!experimentConfig?.experiments) return;
    
    for (const exp of experimentConfig.experiments) {
      // Note: Config API only returns running experiments, no need to check status
      
      const variantId = experimentAssignments[exp.id];
      if (!variantId) continue;
      
      // Support both new goals array and legacy goal_event (minified as 'g')
      const legacyGoal = exp.g || exp.goal_event;
      const goals = exp.goals || (legacyGoal ? [{
        id: 'legacy_goal',
        name: legacyGoal,
        type: 'custom_event',
        event_name: legacyGoal,
        is_primary: true
      }] : []);
      
      for (const goal of goals) {
        if (evaluateGoal(goal, eventType, eventData)) {
          trackGoalConversion(exp.id, variantId, goal, eventData);
        }
      }
    }
  }
  
  /**
   * Public API: Track custom event with goal evaluation
   */
  function trackEvent(eventName, properties = {}) {
    evaluateExperimentGoals(eventName, { properties });
    
    // Also send as regular event
    sendWrappedBeacon(EVENTS_ENDPOINT, {
      event_type: eventName,
      properties,
      timestamp: Date.now(),
      page_path: window.location.pathname,
    });
  }
  
  /**
   * Track revenue/purchase event
   */
  function trackRevenue(eventName, amount, properties = {}) {
    const revenueData = {
      properties: { ...properties, amount, value: amount },
      amount,
    };
    evaluateExperimentGoals(eventName, revenueData);
    
    sendWrappedBeacon(EVENTS_ENDPOINT, {
      event_type: eventName,
      revenue: amount,
      properties,
      timestamp: Date.now(),
      page_path: window.location.pathname,
    });
  }
  
  // Track pageview goals on page load
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      evaluateExperimentGoals('pageview', {});
    }, 100); // Small delay to ensure experiments loaded
  });
  
  // Track scroll depth for scroll goals (uses existing maxScrollDepth variable)
  const scrollDepthThresholds = [25, 50, 75, 90, 100];
  let scrollDepthTracked = new Set();
  
  window.addEventListener('scroll', () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;
    
    const currentDepth = Math.round((window.scrollY / scrollHeight) * 100);
    if (currentDepth > maxScrollDepth) {
      maxScrollDepth = currentDepth;
      
      // Check thresholds
      for (const threshold of scrollDepthThresholds) {
        if (currentDepth >= threshold && !scrollDepthTracked.has(threshold)) {
          scrollDepthTracked.add(threshold);
          evaluateExperimentGoals('scroll_depth', { depth: threshold });
        }
      }
    }
  }, { passive: true });
  
  // Track time on page for time goals
  let pageStartTime = Date.now();
  const timeThresholds = [15, 30, 60, 120, 300]; // seconds
  let timeTracked = new Set();
  
  setInterval(() => {
    const secondsOnPage = Math.floor((Date.now() - pageStartTime) / 1000);
    
    for (const threshold of timeThresholds) {
      if (secondsOnPage >= threshold && !timeTracked.has(threshold)) {
        timeTracked.add(threshold);
        evaluateExperimentGoals('time_threshold', { seconds: threshold });
      }
    }
  }, 5000); // Check every 5 seconds
  
  // Track clicks for click goals
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target || isEditorElement(target)) return;
    
    evaluateExperimentGoals('click', { 
      element: target, 
      selector: target.tagName?.toLowerCase() 
    });
  }, true);
  
  // Track form submissions for form_submit goals
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form) return;
    
    evaluateExperimentGoals('form_submit', { 
      element: form, 
      formId: form.id,
      formAction: form.action 
    });
  }, true);

  // SPA Navigation Handling
  // Patch pushState and replaceState to detect route changes
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function() {
    originalPushState.apply(this, arguments);
    handleUrlChange();
  };

  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    handleUrlChange();
  };

  window.addEventListener('popstate', handleUrlChange);

  // Handle URL change for SPA
  function handleUrlChange() {
    setTimeout(() => {
      evaluateExperimentGoals('pageview', { 
        url: window.location.href, 
        path: window.location.pathname 
      });
      // Also re-apply experiment modifications if needed
      if (window.navlens && window.navlens.getExperiments) {
         window.navlens.getExperiments(); 
        // Re-run experiment logic if needed (handled by tracker mostly, but goals need specific trigger)
      }
    }, 100);
  }
  
  // Helper to check if element is editor element
  function isEditorElement(el) {
    return el.closest?.('[data-navlens-ignore]') || false;
  }

  // Expose experiment functions globally
  window.navlens = window.navlens || {};
  window.navlens.setExperiment = setExperimentAssignment;
  window.navlens.getExperiments = getActiveExperiments;
  window.navlens.reloadExperiments = initExperiments;
  window.navlens.track = trackEvent;
  window.navlens.trackRevenue = trackRevenue;

  // Initialize experiments immediately (before DOMContentLoaded)
  // Store promise so initFeedback can wait for merged config to load
   initExperiments();

  // ============================================
  // VISUAL EDITOR MODE DETECTION
  // Lazy load editor only when needed
  // ============================================
  if (new URLSearchParams(window.location.search).has('__navlens_editor')) {
    const editorScript = document.createElement('script');
    editorScript.src = `${normalizedHost}/ab-editor.js`;
    editorScript.async = true;
    document.head.appendChild(editorScript);
  }
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
      // A/B Testing: Include experiment assignments with every event
      experiment_ids: Object.keys(getActiveExperiments()),
      variant_ids: Object.values(getActiveExperiments()),
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
      } catch (_error) {
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

    // CRITICAL: keepalive has a 64KB limit in Chrome!
    // Requests over this limit will hang forever in "pending" state.
    // Only use keepalive for small payloads (under 60KB to be safe).
    const payloadSize = compressed.size || 0;
    const useKeepalive = payloadSize < 60000; // 60KB limit for safety

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: compressed,
        keepalive: useKeepalive,
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
    for (const [_, config] of Object.entries(PII_PATTERNS)) {
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

  /**
   * Unified batch flush - sends debug + form events in single request
   * Falls back to individual endpoints if batch fails
   */
  async function flushAllEventsBatch() {
    // Collect all pending events
    const debugEvents = debugEventBuffer.splice(0, debugEventBuffer.length);
    const formEvents = typeof formEventBuffer !== 'undefined' ? formEventBuffer.splice(0, formEventBuffer.length) : [];
    
    // Nothing to send
    if (debugEvents.length === 0 && formEvents.length === 0) return;
    
    // Clear timers
    if (debugBatchTimer) { clearTimeout(debugBatchTimer); debugBatchTimer = null; }
    if (typeof formBatchTimer !== 'undefined' && formBatchTimer) { clearTimeout(formBatchTimer); formBatchTimer = null; }
    
    if (useBatchMode) {
      try {
        await sendCompressedFetch(BATCH_ENDPOINT, {
          siteId: SITE_ID,
          sessionId: SESSION_ID,
          batch: {
            debug: debugEvents.length > 0 ? debugEvents : undefined,
            forms: formEvents.length > 0 ? formEvents : undefined,
          }
        }, false);
        return; // Success
      } catch (error) {
        console.warn('[Navlens] Batch send failed, falling back to individual:', error.message);
        useBatchMode = false; // Disable batch mode for this session
      }
    }
    
    // Fallback: send individually
    if (debugEvents.length > 0) {
      sendCompressedFetch(DEBUG_EVENTS_ENDPOINT, { events: debugEvents, siteId: SITE_ID, sessionId: SESSION_ID }, false).catch(() => {});
    }
    if (formEvents.length > 0) {
      sendCompressedFetch(FORM_EVENTS_ENDPOINT, { events: formEvents, siteId: SITE_ID, sessionId: SESSION_ID }, false).catch(() => {});
    }
  }
  
  // Schedule periodic batch flush (every 3 seconds)
  setInterval(flushAllEventsBatch, 3000);

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
    } catch (_e) {
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
    if (!url || typeof url !== 'string') return false;
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
      return scrubPII(String(url));
    }
  }

  // Intercept fetch - must be careful not to break original calls
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    // Safely extract URL without modifying arguments
    let url = '';
    let method = 'GET';
    
    try {
      const input = args[0];
      const init = args[1];
      
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input instanceof Request) {
        url = input.url;
        method = input.method || 'GET';
      } else if (typeof input === 'object' && input !== null && 'url' in input) {
        url = input.url;
      }
      
      // Get method from init if provided
      if (init && typeof init === 'object' && init.method) {
        method = init.method;
      }
    } catch (_e) {
      // If we can't parse, just pass through
      return originalFetch.apply(this, args);
    }
    
    // Skip our own endpoints - pass through unchanged
    if (url && shouldIgnoreUrl(url)) {
      return originalFetch.apply(this, args);
    }

    const startTime = performance.now();

    // Call original fetch with original arguments (unchanged)
    return originalFetch.apply(this, args)
      .then(response => {
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
      })
      .catch(error => {
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
      });
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
    } catch (_e) { /* Not supported */ }

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
    } catch (_e) { /* Not supported */ }

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
    } catch (_e) { /* Not supported */ }

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
    } catch (_e) { /* Not supported */ }

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
    } catch (_e) { /* Not supported */ }
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
   * Uses getAttribute to avoid DOM clobbering (e.g., input name="id" or name="name")
   */
  function getFormId(form) {
    const formId = form.getAttribute('id');
    if (formId) return `id:${formId}`;
    const formName = form.getAttribute('name');
    if (formName) return `name:${formName}`;
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
    } catch (_error) {
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
    } catch (_e) {
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
    } catch (_e) {
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
    } catch (_e) {
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
    } catch (_e) {
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
          `${normalizedHost}/rrweb.min.js`
        );
      } catch (_e) {
        console.warn(
          "[Navlens] Failed to load rrweb, session recording disabled"
        );
        return;
      }
    }

    if (isRecording) return;

    try {
      isRecording = true;
       rrweb.record({
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


  async function captureSnapshot(viewportConfig = null) {
    return scheduleTask(async () => {
      // Dynamically load rrweb-snapshot if not present (use window. for safer global check)
      if (typeof window.rrwebSnapshot === "undefined" || !window.rrwebSnapshot?.snapshot) {
        try {
          console.log("[Navlens] Loading rrweb-snapshot...");
          await loadScript(
            "https://cdn.jsdelivr.net/npm/rrweb-snapshot@latest/dist/rrweb-snapshot.min.js"
          );
        } catch (_e) {
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
  // CONFUSION SCROLLING DETECTION
  // Detects rapid up/down scrolling indicating user confusion
  // ============================================
  const CONFUSION_CONFIG = {
    DIRECTION_CHANGE_THRESHOLD: 5,   // Direction changes to trigger confusion
    TIME_WINDOW_MS: 2000,            // Time window for detection
    MIN_SCROLL_DISTANCE: 50,         // Minimum scroll distance to count
    COOLDOWN_MS: 5000,               // Cooldown between confusion events
  };

  let scrollDirectionHistory = [];
  let lastScrollY = window.scrollY;
  let lastScrollDirection = null;
  let lastConfusionEventTime = 0;
  let confusionScrollDebounce = null;

  function detectConfusionScrolling() {
    const currentY = window.scrollY;
    const scrollDelta = currentY - lastScrollY;
    const now = Date.now();

    // Only consider significant scroll changes
    if (Math.abs(scrollDelta) < CONFUSION_CONFIG.MIN_SCROLL_DISTANCE) {
      lastScrollY = currentY;
      return;
    }

    const currentDirection = scrollDelta > 0 ? 'down' : 'up';

    // Record direction change
    if (lastScrollDirection !== null && currentDirection !== lastScrollDirection) {
      scrollDirectionHistory.push({
        time: now,
        direction: currentDirection,
        delta: Math.abs(scrollDelta)
      });
    }

    lastScrollDirection = currentDirection;
    lastScrollY = currentY;

    // Clean old entries
    scrollDirectionHistory = scrollDirectionHistory.filter(
      entry => now - entry.time < CONFUSION_CONFIG.TIME_WINDOW_MS
    );

    // Limit history size
    if (scrollDirectionHistory.length > 20) {
      scrollDirectionHistory = scrollDirectionHistory.slice(-20);
    }

    // Check for confusion pattern
    if (scrollDirectionHistory.length >= CONFUSION_CONFIG.DIRECTION_CHANGE_THRESHOLD) {
      // Check cooldown
      if (now - lastConfusionEventTime < CONFUSION_CONFIG.COOLDOWN_MS) {
        return;
      }

      // Calculate confusion score (0-1 based on intensity)
      const totalDelta = scrollDirectionHistory.reduce((sum, e) => sum + e.delta, 0);
      const avgDelta = totalDelta / scrollDirectionHistory.length;
      const timeSpan = now - scrollDirectionHistory[0].time;
      const changesPerSecond = (scrollDirectionHistory.length / timeSpan) * 1000;
      
      // Score: higher with more frequent changes and larger scroll distances
      const confusionScore = Math.min(1, (changesPerSecond * avgDelta) / 500);

      sendConfusionScrollEvent(confusionScore, scrollDirectionHistory.length);
      lastConfusionEventTime = now;
      scrollDirectionHistory = [];
    }
  }

  function sendConfusionScrollEvent(score, directionChanges) {
    const docDimensions = getDocumentDimensions();
    const confusionData = {
      event_type: 'confusion_scroll',
      event_id: generateEventId(),
      session_id: SESSION_ID,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_path: window.location.pathname,
      scroll_depth: maxScrollDepth,
      confusion_scroll_score: parseFloat(score.toFixed(3)),
      cursor_direction_changes: directionChanges,
      document_width: docDimensions.width,
      document_height: docDimensions.height,
      device_info: getDeviceInfo(),
    };

    sendWrappedFetch(V1_INGEST_ENDPOINT, confusionData).catch(console.error);
    console.log('[Navlens] Confusion scrolling detected! Score:', score.toFixed(2));
  }

  function initConfusionScrollTracking() {
    window.addEventListener('scroll', () => {
      clearTimeout(confusionScrollDebounce);
      confusionScrollDebounce = setTimeout(detectConfusionScrolling, 50);
    }, { passive: true });
  }

  // ============================================
  // HOVER/ATTENTION TRACKING
  // Tracks mouse movement with dwell time for attention heatmaps
  // ============================================
  const HOVER_CONFIG = {
    SAMPLE_INTERVAL_MS: 50,          // Mouse position sampling rate
    MIN_HOVER_DURATION_MS: 500,      // Minimum attention time to track
    BATCH_SIZE: 50,                  // Events before sending batch
    FLUSH_INTERVAL_MS: 10000,        // Maximum time before flush
    MAX_BUFFER_SIZE: 200,            // Maximum buffer size before dropping old events
  };

  let mousePositionBuffer = [];
  let elementHoverTimes = new Map();  // element selector -> { startTime, totalTime }
  let lastMousePosition = { x: 0, y: 0 };
  let lastMouseMoveTime = 0;
  let hoverBatchTimer = null;
  // isMouseMoving was unused
  let mouseThrottleTimer = null;

  function trackMouseMovement(event) {
    const now = Date.now();
    
    // Throttle mouse tracking
    if (mouseThrottleTimer) return;
    mouseThrottleTimer = setTimeout(() => mouseThrottleTimer = null, HOVER_CONFIG.SAMPLE_INTERVAL_MS);

    const x = event.clientX;
    const y = event.clientY;
    const pageX = event.pageX;
    const pageY = event.pageY;
    const docDimensions = getDocumentDimensions();

    // Calculate velocity
    const deltaX = x - lastMousePosition.x;
    const deltaY = y - lastMousePosition.y;
    const deltaTime = now - lastMouseMoveTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = deltaTime > 0 ? distance / deltaTime : 0;

    lastMousePosition = { x, y };
    lastMouseMoveTime = now;
    

    // Get element under cursor
    const element = document.elementFromPoint(x, y);
    let elementSelector = '';
    let attentionZone = '';

    if (element) {
      elementSelector = generateElementSelector(element);
      
      // Determine attention zone based on element type
      const tag = element.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        attentionZone = 'heading';
      } else if (['p', 'article', 'section'].includes(tag)) {
        attentionZone = 'content';
      } else if (['a', 'button'].includes(tag) || element.getAttribute('role') === 'button') {
        attentionZone = 'interactive';
      } else if (['img', 'video', 'svg', 'canvas'].includes(tag)) {
        attentionZone = 'media';
      } else if (['nav', 'header', 'footer'].includes(tag)) {
        attentionZone = 'navigation';
      } else if (['form', 'input', 'select', 'textarea'].includes(tag)) {
        attentionZone = 'form';
      } else {
        attentionZone = 'other';
      }

      // Track hover time on element
      updateElementHoverTime(elementSelector, now);
    }

    // Add to buffer
    mousePositionBuffer.push({
      x: pageX,
      y: pageY,
      x_relative: docDimensions.width > 0 ? parseFloat((pageX / docDimensions.width).toFixed(4)) : 0,
      y_relative: docDimensions.height > 0 ? parseFloat((pageY / docDimensions.height).toFixed(4)) : 0,
      velocity: parseFloat(velocity.toFixed(2)),
      timestamp: now,
      attention_zone: attentionZone,
      element_selector: elementSelector.substring(0, 200),
    });

    // Enforce buffer limit
    if (mousePositionBuffer.length > HOVER_CONFIG.MAX_BUFFER_SIZE) {
      mousePositionBuffer = mousePositionBuffer.slice(-HOVER_CONFIG.MAX_BUFFER_SIZE);
    }

    // Batch send
    if (mousePositionBuffer.length >= HOVER_CONFIG.BATCH_SIZE) {
      flushMousePositionBuffer();
    } else if (!hoverBatchTimer) {
      hoverBatchTimer = setTimeout(flushMousePositionBuffer, HOVER_CONFIG.FLUSH_INTERVAL_MS);
    }
  }

  function updateElementHoverTime(selector, now) {
    if (!elementHoverTimes.has(selector)) {
      elementHoverTimes.set(selector, { startTime: now, totalTime: 0 });
    }
    
    const hoverData = elementHoverTimes.get(selector);
    // If last update was recent, add to total time
    if (hoverData.lastUpdate && now - hoverData.lastUpdate < 200) {
      hoverData.totalTime += now - hoverData.lastUpdate;
    }
    hoverData.lastUpdate = now;

    // Limit tracker size
    if (elementHoverTimes.size > 100) {
      // Remove oldest entries
      const entries = Array.from(elementHoverTimes.entries());
      entries.sort((a, b) => (a[1].lastUpdate || 0) - (b[1].lastUpdate || 0));
      for (let i = 0; i < 20; i++) {
        elementHoverTimes.delete(entries[i][0]);
      }
    }
  }

  function flushMousePositionBuffer() {
    if (hoverBatchTimer) {
      clearTimeout(hoverBatchTimer);
      hoverBatchTimer = null;
    }

    if (mousePositionBuffer.length === 0) return;

    // Simplify path using Douglas-Peucker algorithm
    const simplifiedPath = douglasPeuckerSimplify(mousePositionBuffer, 3);
    const events = mousePositionBuffer.splice(0, mousePositionBuffer.length);
    
    // Calculate path metrics
    const pathMetrics = calculatePathMetrics(events);

    const docDimensions = getDocumentDimensions();
    const hoverData = {
      event_type: 'mouse_move',
      event_id: generateEventId(),
      session_id: SESSION_ID,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      page_path: window.location.pathname,
      cursor_path_distance: pathMetrics.totalDistance,
      cursor_direction_changes: pathMetrics.directionChanges,
      is_erratic_movement: pathMetrics.isErratic,
      document_width: docDimensions.width,
      document_height: docDimensions.height,
      // Store simplified path in data
      path_points: simplifiedPath.length,
      avg_velocity: pathMetrics.avgVelocity,
      device_info: getDeviceInfo(),
    };

    sendWrappedFetch(V1_INGEST_ENDPOINT, hoverData).catch(console.error);
    
    // Send dedicated erratic_movement event for frustration signal tracking
    if (pathMetrics.isErratic) {
      const erraticData = {
        event_type: 'erratic_movement',
        event_id: generateEventId(),
        session_id: SESSION_ID,
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        page_path: window.location.pathname,
        cursor_path_distance: pathMetrics.totalDistance,
        cursor_direction_changes: pathMetrics.directionChanges,
        avg_velocity: pathMetrics.avgVelocity,
        erratic_score: parseFloat((pathMetrics.directionChanges / pathMetrics.totalDistance).toFixed(4)),
        document_width: docDimensions.width,
        document_height: docDimensions.height,
        device_info: getDeviceInfo(),
      };
      sendWrappedFetch(V1_INGEST_ENDPOINT, erraticData).catch(console.error);
      console.log('[Navlens] Erratic mouse movement detected! Direction changes:', pathMetrics.directionChanges);
    }
  }

  // ============================================
  // CURSOR PATH ANALYSIS
  // Path metrics and simplification for cursor tracking
  // ============================================
  const PATH_CONFIG = {
    ERRATIC_THRESHOLD: 0.4,    // Direction changes per pixel ratio
    MIN_DISTANCE: 100,         // Minimum distance to analyze
  };

  function calculatePathMetrics(points) {
    if (points.length < 2) {
      return { totalDistance: 0, directionChanges: 0, avgVelocity: 0, isErratic: false };
    }

    let totalDistance = 0;
    let directionChanges = 0;
    let totalVelocity = 0;
    let lastAngle = null;

    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      totalDistance += distance;
      totalVelocity += points[i].velocity || 0;

      if (distance > 5) {  // Only count significant movements
        const angle = Math.atan2(dy, dx);
        if (lastAngle !== null) {
          const angleDiff = Math.abs(angle - lastAngle);
          // Count significant direction changes (> 45 degrees)
          if (angleDiff > Math.PI / 4 && angleDiff < 7 * Math.PI / 4) {
            directionChanges++;
          }
        }
        lastAngle = angle;
      }
    }

    const avgVelocity = totalVelocity / points.length;
    
    // Determine if movement is erratic
    // Erratic = many direction changes relative to distance traveled
    const isErratic = totalDistance > PATH_CONFIG.MIN_DISTANCE && 
      (directionChanges / totalDistance) > PATH_CONFIG.ERRATIC_THRESHOLD;

    return {
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      directionChanges: directionChanges,
      avgVelocity: parseFloat(avgVelocity.toFixed(2)),
      isErratic: isErratic
    };
  }

  /**
   * Douglas-Peucker path simplification algorithm
   * Reduces number of points while preserving path shape
   */
  function douglasPeuckerSimplify(points, epsilon) {
    if (points.length <= 2) return points;

    // Find point with maximum distance from line
    let maxDist = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = perpendicularDistance(points[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        maxIndex = i;
      }
    }

    // If max distance is greater than epsilon, recursively simplify
    if (maxDist > epsilon) {
      const left = douglasPeuckerSimplify(points.slice(0, maxIndex + 1), epsilon);
      const right = douglasPeuckerSimplify(points.slice(maxIndex), epsilon);
      return left.slice(0, -1).concat(right);
    } else {
      return [start, end];
    }
  }

  function perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    if (dx === 0 && dy === 0) {
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) + 
        Math.pow(point.y - lineStart.y, 2)
      );
    }

    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
    const closestX = lineStart.x + t * dx;
    const closestY = lineStart.y + t * dy;

    return Math.sqrt(
      Math.pow(point.x - closestX, 2) + 
      Math.pow(point.y - closestY, 2)
    );
  }

  // ============================================
  // HOVER EVENT TRACKING
  // Send hover events when user dwells on elements
  // ============================================
  // Hover tracking state
  let hoverCheckInterval = null;
  // lastHoverFlushTime was unused
  

  function initHoverTracking() {
    // Check hover times periodically and send significant hovers
    hoverCheckInterval = setInterval(() => {

      const significantHovers = [];

      elementHoverTimes.forEach((data, selector) => {
        if (data.totalTime >= HOVER_CONFIG.MIN_HOVER_DURATION_MS) {
          significantHovers.push({
            element_selector: selector.substring(0, 200),
            hover_duration_ms: data.totalTime,
          });
        }
      });

      if (significantHovers.length > 0) {
        sendHoverEvents(significantHovers);
      }

      // Clear processed hovers
      elementHoverTimes.clear();
    }, 30000);  // Check every 30 seconds
  }

  function sendHoverEvents(hovers) {
    if (hovers.length === 0) return;

    const docDimensions = getDocumentDimensions();
    
    // Send top 10 most significant hovers
    const topHovers = hovers
      .sort((a, b) => b.hover_duration_ms - a.hover_duration_ms)
      .slice(0, 10);

    topHovers.forEach(hover => {
      const hoverData = {
        event_type: 'hover',
        event_id: generateEventId(),
        session_id: SESSION_ID,
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        page_path: window.location.pathname,
        element_selector: hover.element_selector,
        hover_duration_ms: hover.hover_duration_ms,
        document_width: docDimensions.width,
        document_height: docDimensions.height,
        device_info: getDeviceInfo(),
      };

      sendWrappedFetch(V1_INGEST_ENDPOINT, hoverData).catch(console.error);
    });
  }

  function initMouseTracking() {
    // Use throttled mouse move tracking
    document.addEventListener('mousemove', trackMouseMovement, { passive: true });
    
    // Track when mouse stops moving
    document.addEventListener('mouseleave', () => {
      flushMousePositionBuffer();
    });

    // Initialize hover tracking
    initHoverTracking();
  }

  // NOTE: Old VoC/Survey system removed - use Feedback Widget (initFeedback) instead

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

    // Evaluate click goals for A/B experiments
    evaluateExperimentGoals('click', { element, selector });

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

    // Initialize behavioral tracking (Frustration Signals)
    initConfusionScrollTracking();
    initMouseTracking();

    // Initialize VoC (Voice of Customer)
    scheduleTask(() => {
     // initFeedbackWidget(); // REMOVED: Replaced by new Feedback Widget
     // loadSurveys(); // REMOVED: Conflicted with new widget
    }, "idle");

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

    // Capture initial snapshot and start DOM monitoring (with 5s delay for page to render)
    setTimeout(() => {
      scheduleTask(async () => {
        const snapshot = await captureSnapshot();
        if (snapshot) {
          snapshot.hash = generateDomHash();  // Backend expects 'hash' not 'dom_hash'
          sendSnapshot(snapshot);
        }
        // Start DOM hash monitoring after initial snapshot
        startDomHashMonitoring();
      }, "idle");
    }, 5000); // Wait 5 seconds for page to fully render

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
      "[Navlens] Features: VoC Widget ✓ | Micro-Surveys ✓ | Frustration ✓ | Compression ✓ | PII Scrubbing ✓ | Dead Click ✓ | Hover ✓ | Cursor Paths ✓"
    );
  }

  // ============================================
  // PUBLIC API
  // ============================================
  window.Navlens = {
    version: "7.0.0",
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

    // Get session ID
    getSessionId: () => SESSION_ID,
    
    // Get visitor ID
    getVisitorId: () => VISITOR_ID,
    
    // Set context for all future events
    setContext: (context = {}) => {
      if (typeof context !== 'object') return;
      window.__navlens_context = { ...(window.__navlens_context || {}), ...context };
    },

    // PII scrubbing utilities
    scrubPII,
    scrubObjectPII,
  };
  
  // Backwards compatibility alias
  window.navlens = window.Navlens;

  // ============================================
  // FEEDBACK WIDGET
  // Custom survey/feedback collection widget
  // Fetches configuration from dashboard settings
  // ============================================
  
  // Default config (overridden by API fetch)
  let FEEDBACK_CONFIG = {
    enabled: true,
    position: 'bottom-right',  // bottom-right, bottom-left, top-right, top-left
    primaryColor: '#3B82F6',
    showOnScroll: 50,          // Show after 50% scroll
    showAfterTime: 30000,      // Show after 30 seconds (minTimeBeforeSurvey * 1000)
    allowDismiss: true,
    collectIntent: true,
    collectIssues: true,
    showExitIntent: true,
    showFrustrationSurvey: true,
  };
  

  
  /**
   * Fetch feedback config from dashboard API
   * Uses cached config from merged endpoint if available
   */
  async function fetchFeedbackConfig() {
    if (!SITE_ID) return;
    
    // Use cached config from merged endpoint if available (saves a request)
    if (cachedFeedbackConfig) {
      FEEDBACK_CONFIG = {
        ...FEEDBACK_CONFIG,
        enabled: cachedFeedbackConfig.enabled ?? true,
        position: cachedFeedbackConfig.position || 'bottom-right',
        primaryColor: cachedFeedbackConfig.primaryColor || '#3B82F6',
        allowDismiss: cachedFeedbackConfig.allowDismiss ?? true,
        showExitIntent: cachedFeedbackConfig.showExitIntent ?? true,
        showFrustrationSurvey: cachedFeedbackConfig.showFrustrationSurvey ?? true,
        showAfterTime: (cachedFeedbackConfig.minTimeBeforeSurvey || 30) * 1000,
        showOnScroll: cachedFeedbackConfig.showOnScroll || 50,
        collectIntent: cachedFeedbackConfig.collectIntent ?? true,
        collectIssues: cachedFeedbackConfig.collectIssues ?? true,
      };
      console.log('[Navlens] Feedback config loaded from merged endpoint');
      return;
    }
    
    // Fallback to individual endpoint
    try {
      const response = await fetch(`${FEEDBACK_CONFIG_ENDPOINT}?siteId=${SITE_ID}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          // Merge with defaults, mapping dashboard fields to tracker fields
          FEEDBACK_CONFIG = {
            ...FEEDBACK_CONFIG,
            enabled: data.config.enabled ?? true,
            position: data.config.position || 'bottom-right',
            primaryColor: data.config.primaryColor || '#3B82F6',
            allowDismiss: data.config.allowDismiss ?? true,
            showExitIntent: data.config.showExitIntent ?? true,
            showFrustrationSurvey: data.config.showFrustrationSurvey ?? true,
            // Convert seconds to milliseconds for showAfterTime
            showAfterTime: (data.config.minTimeBeforeSurvey || 30) * 1000,
            showOnScroll: data.config.showOnScroll || 50,
            collectIntent: data.config.collectIntent ?? true,
            collectIssues: data.config.collectIssues ?? true,
          };
          console.log('[Navlens] Feedback config loaded from dashboard');
        }
      }
    } catch (error) {
      console.warn('[Navlens] Failed to fetch feedback config, using defaults:', error.message);
    }
  }
  
  const RATING_OPTIONS = [
    { value: 1, emoji: '😡', label: 'Very Bad' },
    { value: 2, emoji: '😞', label: 'Bad' },
    { value: 3, emoji: '😐', label: 'Okay' },
    { value: 4, emoji: '😊', label: 'Good' },
    { value: 5, emoji: '😍', label: 'Excellent' },
  ];
  
  const ISSUE_OPTIONS = [
    { code: 'cant_find', label: "Couldn't find what I need", icon: '🔍' },
    { code: 'confusing', label: 'Confusing navigation', icon: '🧭' },
    { code: 'slow', label: 'Page too slow', icon: '⏳' },
    { code: 'broken', label: 'Something broken', icon: '🔧' },
    { code: 'pricing', label: 'Pricing unclear', icon: '💰' },
    { code: 'other', label: 'Other issue', icon: '❓' },
  ];
  
  const INTENT_OPTIONS = [
    { code: 'buy', label: 'Buy', icon: '🛒' },
    { code: 'learn', label: 'Learn', icon: '📚' },
    { code: 'compare', label: 'Compare', icon: '⚖️' },
    { code: 'support', label: 'Get Help', icon: '💬' },
    { code: 'browse', label: 'Just Browsing', icon: '👀' },
  ];
  
  let feedbackWidgetInstance = null;
  let feedbackModalOpen = false;
  let feedbackDismissed = false;
  let feedbackSubmitted = false;
  
  /**
   * Load feedback widget styles from external CSS file
   */
  function injectFeedbackStyles() {
    if (document.getElementById('navlens-feedback-styles')) return;
    
    // Load external CSS file
    const link = document.createElement('link');
    link.id = 'navlens-feedback-styles';
    link.rel = 'stylesheet';
    link.href = `${normalizedHost}/navlens-feedback.css`;
    document.head.appendChild(link);
  }
  
  /**
   * Create the feedback button
   */
  function createFeedbackButton() {
    const btn = document.createElement('button');
    btn.className = `navlens-feedback-btn ${FEEDBACK_CONFIG.position}`;
    btn.style.backgroundColor = FEEDBACK_CONFIG.primaryColor;
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span>Feedback</span>
    `;
    btn.onclick = openFeedbackModal;
    document.body.appendChild(btn);
    feedbackWidgetInstance = btn;
  }
  
  /**
   * Open the feedback modal
   */
  function openFeedbackModal() {
    if (feedbackModalOpen) return;
    feedbackModalOpen = true;
    
    // Hide the button
    if (feedbackWidgetInstance) {
      feedbackWidgetInstance.classList.add('navlens-hidden');
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'navlens-feedback-modal';
    modal.className = 'navlens-feedback-modal';
    
    let currentStep = 'rating';
    let selectedRating = null;
    let selectedIssues = [];
    let selectedIntent = null;
    let feedbackMessage = '';
    
    function renderStep() {
      const body = modal.querySelector('.navlens-feedback-body');
      if (!body) return;
      
      if (currentStep === 'rating') {
        body.innerHTML = `
          <p class="navlens-feedback-step-title">How would you rate your experience?</p>
          <div class="navlens-rating-group">
            ${RATING_OPTIONS.map(opt => `
              <button class="navlens-rating-btn ${selectedRating === opt.value ? 'selected' : ''}" 
                      data-rating="${opt.value}" title="${opt.label}">
                ${opt.emoji}
              </button>
            `).join('')}
          </div>
        `;
        
        body.querySelectorAll('.navlens-rating-btn').forEach(btn => {
          btn.onclick = () => {
            selectedRating = parseInt(btn.dataset.rating);
            if (FEEDBACK_CONFIG.collectIssues && selectedRating <= 3) {
              currentStep = 'issues';
            } else if (FEEDBACK_CONFIG.collectIntent) {
              currentStep = 'intent';
            } else {
              currentStep = 'message';
            }
            renderStep();
          };
        });
        
      } else if (currentStep === 'issues') {
        body.innerHTML = `
          <p class="navlens-feedback-step-title">What went wrong?</p>
          <div class="navlens-options-grid">
            ${ISSUE_OPTIONS.map(opt => `
              <button class="navlens-option-btn ${selectedIssues.includes(opt.code) ? 'selected' : ''}" 
                      data-issue="${opt.code}">
                <span class="navlens-option-icon">${opt.icon}</span>
                <span>${opt.label}</span>
              </button>
            `).join('')}
          </div>
          <button class="navlens-submit-btn" ${selectedIssues.length === 0 ? 'disabled' : ''}>Continue</button>
          <button class="navlens-skip-btn">Skip</button>
        `;
        
        body.querySelectorAll('.navlens-option-btn').forEach(btn => {
          btn.onclick = () => {
            const code = btn.dataset.issue;
            if (selectedIssues.includes(code)) {
              selectedIssues = selectedIssues.filter(c => c !== code);
            } else {
              selectedIssues.push(code);
            }
            renderStep();
          };
        });
        
        body.querySelector('.navlens-submit-btn').onclick = () => {
          currentStep = FEEDBACK_CONFIG.collectIntent ? 'intent' : 'message';
          renderStep();
        };
        
        body.querySelector('.navlens-skip-btn').onclick = () => {
          currentStep = FEEDBACK_CONFIG.collectIntent ? 'intent' : 'message';
          renderStep();
        };
        
      } else if (currentStep === 'intent') {
        body.innerHTML = `
          <p class="navlens-feedback-step-title">What brought you here today?</p>
          <div class="navlens-options-grid">
            ${INTENT_OPTIONS.map(opt => `
              <button class="navlens-option-btn ${selectedIntent === opt.code ? 'selected' : ''}" 
                      data-intent="${opt.code}">
                <span class="navlens-option-icon">${opt.icon}</span>
                <span>${opt.label}</span>
              </button>
            `).join('')}
          </div>
          <button class="navlens-submit-btn" ${!selectedIntent ? 'disabled' : ''}>Continue</button>
          <button class="navlens-skip-btn">Skip</button>
        `;
        
        body.querySelectorAll('.navlens-option-btn').forEach(btn => {
          btn.onclick = () => {
            selectedIntent = btn.dataset.intent;
            renderStep();
          };
        });
        
        body.querySelector('.navlens-submit-btn').onclick = () => {
          currentStep = 'message';
          renderStep();
        };
        
        body.querySelector('.navlens-skip-btn').onclick = () => {
          currentStep = 'message';
          renderStep();
        };
        
      } else if (currentStep === 'message') {
        body.innerHTML = `
          <p class="navlens-feedback-step-title">Any additional feedback? (optional)</p>
          <textarea class="navlens-textarea" rows="4" placeholder="Tell us more about your experience..."></textarea>
          <button class="navlens-submit-btn">Submit Feedback</button>
        `;
        
        const textarea = body.querySelector('.navlens-textarea');
        textarea.oninput = (e) => {
          feedbackMessage = e.target.value;
        };
        
        body.querySelector('.navlens-submit-btn').onclick = async (e) => {
          const btn = e.target;
          const originalText = btn.textContent;
          btn.textContent = 'Sending...';
          btn.disabled = true;
          btn.style.opacity = '0.7';
          btn.style.cursor = 'wait';

          const success = await submitFeedback({ selectedRating, selectedIssues, selectedIntent, feedbackMessage });
          
          if (success) {
            currentStep = 'success';
            renderStep();
          } else {
            btn.textContent = 'Failed. Try Again';
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            setTimeout(() => {
              btn.textContent = originalText;
            }, 3000);
          }
        };
        
      } else if (currentStep === 'success') {
        feedbackSubmitted = true;
        body.innerHTML = `
          <div class="navlens-success">
            <div class="navlens-success-icon">🎉</div>
            <h3 class="navlens-success-title">Thank You!</h3>
            <p class="navlens-success-text">Your feedback helps us improve.</p>
          </div>
        `;
        
        setTimeout(() => {
          closeFeedbackModal();
        }, 2000);
      }
    }
    
    modal.innerHTML = `
      <div class="navlens-feedback-backdrop"></div>
      <div class="navlens-feedback-content">
        <div class="navlens-feedback-header">
          <h2 class="navlens-feedback-title">Share Your Feedback</h2>
          <button class="navlens-feedback-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="navlens-feedback-body"></div>
        ${FEEDBACK_CONFIG.allowDismiss ? `
        <div class="navlens-footer">
          <button class="navlens-dismiss-btn">Don't show again on this page</button>
        </div>
        ` : ''}
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.navlens-feedback-backdrop').onclick = closeFeedbackModal;
    modal.querySelector('.navlens-feedback-close').onclick = closeFeedbackModal;
    
    if (FEEDBACK_CONFIG.allowDismiss) {
      modal.querySelector('.navlens-dismiss-btn').onclick = () => {
        feedbackDismissed = true;
        sessionStorage.setItem('navlens_feedback_dismissed', 'true');
        closeFeedbackModal();
      };
    }
    
    renderStep();
  }
  
  /**
   * Close the feedback modal
   */
  function closeFeedbackModal() {
    const modal = document.getElementById('navlens-feedback-modal');
    if (modal) {
      modal.remove();
    }
    feedbackModalOpen = false;
    
    // Show button again if not dismissed and not submitted
    if (feedbackWidgetInstance && !feedbackDismissed && !feedbackSubmitted) {
      feedbackWidgetInstance.classList.remove('navlens-hidden');
    }
  }
  
  /**
   * Submit feedback to the server
   */
  async function submitFeedback(data) {
    const payload = {
      siteId: SITE_ID,
      sessionId: SESSION_ID,
      rating: data.selectedRating,
      intent: data.selectedIntent,
      issues: data.selectedIssues,
      message: scrubPII(data.feedbackMessage || ''),
      pagePath: window.location.pathname,
      pageUrl: window.location.href,
      deviceType: getDeviceType(),
      userAgent: navigator.userAgent,
      surveyType: 'manual',
      timestamp: new Date().toISOString(),
    };
    
    try {
      await sendCompressedFetch(FEEDBACK_ENDPOINT, payload, false);
      console.log('[Navlens] Feedback submitted successfully');
      return true;
    } catch (error) {
      console.warn('[Navlens] Failed to submit feedback:', error.message);
      return false;
    }
  }
  
  /**
   * Initialize feedback widget
   * Fetches config from dashboard first
   */
  async function initFeedback() {
    // Fetch config from dashboard API first
    await fetchFeedbackConfig();
    
    if (!FEEDBACK_CONFIG.enabled) return;
    
    // Check if dismissed this session
    if (sessionStorage.getItem('navlens_feedback_dismissed') === 'true') {
      feedbackDismissed = true;
      return;
    }
    
    injectFeedbackStyles();
    
    // Update button color dynamically
    const updateButtonColor = () => {
      if (feedbackWidgetInstance) {
        feedbackWidgetInstance.style.backgroundColor = FEEDBACK_CONFIG.primaryColor;
      }
    };
    
    // Show after scroll threshold
    let hasShownOnScroll = false;
    function checkScrollTrigger() {
      if (hasShownOnScroll || feedbackDismissed || feedbackSubmitted) return;
      
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent >= FEEDBACK_CONFIG.showOnScroll) {
        hasShownOnScroll = true;
        createFeedbackButton();
        updateButtonColor();
      }
    }
    
    // Show after time delay
    setTimeout(() => {
      if (!feedbackWidgetInstance && !feedbackDismissed && !feedbackSubmitted) {
        createFeedbackButton();
        updateButtonColor();
      }
    }, FEEDBACK_CONFIG.showAfterTime);
    
    window.addEventListener('scroll', checkScrollTrigger, { passive: true });
    
    // Exit intent detection (if enabled)
    if (FEEDBACK_CONFIG.showExitIntent) {
      document.addEventListener('mouseleave', (e) => {
        if (e.clientY < 0 && !feedbackModalOpen && !feedbackDismissed && !feedbackSubmitted) {
          // User moving mouse to top of screen (likely to close tab)
          if (!feedbackWidgetInstance) {
            createFeedbackButton();
            updateButtonColor();
          }
          // Optionally auto-open modal
          // openFeedbackModal();
        }
      }, { once: true });
    }
  }

  // Clean up old init reference and update
  // Start when DOM is ready
  // Skip tracking entirely when in editor mode


  // ============================================
  // WEB VITALS TRACKING
  // Captures LCP, CLS, FID/INP, FCP, TTFB
  // ============================================
  
  const webVitalsData = {
    lcp: null,
    cls: 0,
    fid: null,
    inp: null,
    fcp: null,
    ttfb: null,
  };
  
  let clsValue = 0;
  let lcpValue = 0;
  let fidValue = null;
  let fcpValue = null;
  let ttfbValue = null;
  
  /**
   * Send Web Vitals data to the server
   */
  function sendWebVitals() {
    if (webVitalsSent) return;
    webVitalsSent = true;
    
    const vitalsEvent = {
      type: 'web_vitals',
      timestamp: new Date().toISOString(),
      session_id: SESSION_ID,
      page_url: window.location.href,
      page_path: window.location.pathname,
      lcp_ms: Math.round(lcpValue),
      cls: clsValue.toFixed(4),
      fid_ms: fidValue ? Math.round(fidValue) : null,
      inp_ms: webVitalsData.inp ? Math.round(webVitalsData.inp) : null,
      fcp_ms: fcpValue ? Math.round(fcpValue) : null,
      ttfb_ms: ttfbValue ? Math.round(ttfbValue) : null,
    };
    
    console.log('[Navlens] Sending Web Vitals:', vitalsEvent);
    
    try {
      const wrapped = wrapEventForApi(vitalsEvent);
      sendCompressedFetch(V1_INGEST_ENDPOINT, wrapped, false);
    } catch (error) {
      console.warn('[Navlens] Failed to send Web Vitals:', error);
    }
  }
  
  /**
   * Initialize Web Vitals observers
   */
  function initWebVitals() {
    try {
      // LCP (Largest Contentful Paint)
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
              const lastEntry = entries[entries.length - 1];
              lcpValue = lastEntry.startTime;
              webVitalsData.lcp = lcpValue;
            }
          });
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (_e) {
          // LCP not supported
        }
        
        // CLS (Cumulative Layout Shift)
        try {
          const clsObserver = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
                webVitalsData.cls = clsValue;
              }
            }
          });
          clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (_e) {
          // CLS not supported
        }
        
        // FID (First Input Delay) - being replaced by INP
        try {
          const fidObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0 && fidValue === null) {
              fidValue = entries[0].processingStart - entries[0].startTime;
              webVitalsData.fid = fidValue;
            }
          });
          fidObserver.observe({ type: 'first-input', buffered: true });
        } catch (_e) {
          // FID not supported
        }
        
        // INP (Interaction to Next Paint)
        try {
          let maxInp = 0;
          const inpObserver = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              const duration = entry.duration;
              if (duration > maxInp) {
                maxInp = duration;
                webVitalsData.inp = maxInp;
              }
            }
          });
          inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
        } catch (_e) {
          // INP not supported
        }
      }
      
      // FCP (First Contentful Paint)
      try {
        const paint = performance.getEntriesByType('paint');
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint');
        if (fcp) {
          fcpValue = fcp.startTime;
          webVitalsData.fcp = fcpValue;
        }
      } catch (_e) {
        // FCP not supported
      }
      
      // TTFB (Time to First Byte)
      try {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          ttfbValue = navigation.responseStart - navigation.requestStart;
          webVitalsData.ttfb = ttfbValue;
        }
      } catch (_e) {
        // TTFB not supported
      }
      
      // Send Web Vitals when page is about to unload or after 10 seconds
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          sendWebVitals();
        }
      });
      
      window.addEventListener('pagehide', sendWebVitals);
      
      // Also send after 10 seconds in case user stays on page
      setTimeout(sendWebVitals, 10000);
      
    } catch (error) {
      console.warn('[Navlens] Web Vitals initialization failed:', error);
    }
  }
  
  // Initialize Web Vitals tracking
  if (!IS_EDITOR_MODE) {
    if (document.readyState === 'complete') {
      initWebVitals();
    } else {
      window.addEventListener('load', initWebVitals);
    }
  }

  // ============================================
  // NOTIFICATION BANNER
  // Auto-disappearing notification for anonymous tracking
  // Matched to Navlens "Home Theme"
  // ============================================
  
  function initNotificationBanner() {
    if (IS_EDITOR_MODE) return;
    
    // Check if dismissed previously (optional, but good UX to not spam)
    if (sessionStorage.getItem('navlens_notification_seen')) return;
    
    const banner = document.createElement('div');
    banner.id = 'navlens-notification-banner';
    banner.innerHTML = `
      <style>
        #navlens-notification-banner {
          position: fixed;
          bottom: 24px;
          right: 24px;
          max-width: 320px;
          width: calc(100% - 48px);
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 16px;
          padding: 16px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          animation: navlens-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          color: #1f2937;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          pointer-events: none; /* Let clicks pass through if needed, though usually better to capture */
          pointer-events: auto;
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        @media (prefers-color-scheme: dark) {
          #navlens-notification-banner {
            background: rgba(17, 24, 39, 0.8);
            color: #f9fafb;
            border-color: rgba(255, 255, 255, 0.1);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          }
        }

        @keyframes navlens-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .navlens-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
        }

        .navlens-icon {
          width: 20px;
          height: 20px;
          color: white;
        }

        .navlens-content {
          flex: 1;
        }

        .navlens-title {
          font-weight: 600;
          font-size: 14px;
          margin: 0 0 4px 0;
          line-height: 1.3;
        }

        .navlens-text {
          font-size: 12px;
          line-height: 1.5;
          margin: 0;
          opacity: 0.8;
        }
      </style>
      
      <div class="navlens-icon-wrapper">
        <svg class="navlens-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M9 12l2 2 4-4"></path>
        </svg>
      </div>
      <div class="navlens-content">
        <h3 class="navlens-title">Anonymous Analytics</h3>
        <p class="navlens-text">
          This site uses anonymous tracking to improve user experience.
        </p>
      </div>
    `;
    
    document.body.appendChild(banner);
    sessionStorage.setItem('navlens_notification_seen', 'true');

    // Auto-disappear logic
    setTimeout(() => {
      if (banner) {
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(10px)';
        setTimeout(() => banner.remove(), 500); // Wait for transition
      }
    }, 5000);
  }
  
  // Initialize tracker immediately
  // Initialize notification separately
  if (!IS_EDITOR_MODE) {
    // Start tracking immediately
    initExperiments().then(() => {
        try { init(); } catch(e) { console.warn('[Navlens] init() missing', e); }
        initFeedback();
    }).catch(e => {
        console.warn('[Navlens] Init failed:', e);
        const s = document.getElementById(ANTI_FLICKER_ID);
        if (s) s.remove();
    });

    // Show notification (non-blocking)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initNotificationBanner, 1000); // Small delay for polish
      });
    } else {
      setTimeout(initNotificationBanner, 1000);
    }
  }

  console.log('[Navlens] Tracker initialized. Use navlens.track() for custom events.');
})();

