import express from "express";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// Supabase setup with service role key (for server-side operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Replit's Chromium path (verify this in your environment)
const CHROME_PATH =
  "/nix/store/khk7xpgsm5insk81azy9d560yq4npf77-chromium-131.0.6778.204/bin/chromium";

// Device viewports with proper mobile emulation (matching your frontend profiles)
const DEVICE_PROFILES = {
  desktop: {
    width: 1440,
    height: 1080,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  },
  tablet: {
    width: 768,
    height: 1024,
    isMobile: false,
    hasTouch: true,
    deviceScaleFactor: 1,
  },
  mobile: {
    width: 375,
    height: 812, // iPhone X dimensions for better mobile experience
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3, // Retina display quality
  },
};

// Mobile user agents for proper emulation
const MOBILE_USER_AGENTS = {
  mobile:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  tablet:
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  desktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

// CORS middleware for frontend access - MUST be FIRST middleware
app.use((req, res, next) => {
  const origin = req.headers.origin || "*";

  // Send CORS headers for all requests
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "false");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Max-Age", "86400");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    console.log("[CORS] Handling OPTIONS preflight for:", req.path);
    return res.sendStatus(200);
  }

  console.log("[CORS] " + req.method + " " + req.path + " from " + origin);
  next();
});

// Input validation functions
const validators = {
  isValidURL: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  isValidUUID: (uuid) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },
  isValidPagePath: (path) => {
    return typeof path === "string" && path.length <= 500;
  },
};

// SCREENSHOT ENDPOINT (moved from Vercel)
app.post("/api/generate-screenshot", async (req, res) => {
  console.log("[Screenshot] Received request from:", req.headers.origin);
  console.log(
    "[Screenshot] Request body:",
    JSON.stringify(req.body).substring(0, 200)
  );

  try {
    const { pageUrlToScreenshot, siteId, pagePath, deviceType, skipScrolling } =
      req.body;

    // Comprehensive input validation
    if (!pageUrlToScreenshot || typeof pageUrlToScreenshot !== "string") {
      console.error("[Screenshot] Missing pageUrlToScreenshot");
      return res
        .status(400)
        .json({ error: "Missing or invalid pageUrlToScreenshot" });
    }

    if (!siteId || typeof siteId !== "string") {
      return res.status(400).json({ error: "Missing or invalid siteId" });
    }

    // Validate URL format
    if (!validators.isValidURL(pageUrlToScreenshot)) {
      return res
        .status(400)
        .json({ error: "Invalid URL format for pageUrlToScreenshot" });
    }

    // Validate siteId format (UUID)
    if (!validators.isValidUUID(siteId)) {
      return res.status(400).json({ error: "Invalid siteId format" });
    }

    // Validate and sanitize pagePath if provided
    if (pagePath) {
      if (typeof pagePath !== "string") {
        return res.status(400).json({ error: "Invalid pagePath format" });
      }
      if (!validators.isValidPagePath(pagePath)) {
        return res.status(400).json({ error: "Invalid pagePath format" });
      }
    }

    // Validate deviceType
    const validDeviceTypes = ["desktop", "tablet", "mobile"];
    const finalDeviceType = validDeviceTypes.includes(deviceType)
      ? deviceType
      : "desktop";

    const deviceProfile =
      DEVICE_PROFILES[finalDeviceType] || DEVICE_PROFILES.desktop;
    const userAgent =
      MOBILE_USER_AGENTS[finalDeviceType] || MOBILE_USER_AGENTS.desktop;

    console.log(
      `[Smart Scraper] Starting for ${pageUrlToScreenshot} on ${finalDeviceType}`
    );

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--hide-scrollbars",
        "--font-render-hinting=none",
        "--disable-setuid-sandbox",
      ],
    });

    const page = await browser.newPage();

    // 1. Set Viewport & UA
    await page.setViewport({
      ...deviceProfile,
      deviceScaleFactor: deviceProfile.deviceScaleFactor || 1,
    });
    await page.setUserAgent(userAgent);

    // 2. Navigate (Generous Timeout)
    try {
      await page.goto(pageUrlToScreenshot, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch (e) {
      console.warn("Navigation timeout (continuing):", e.message);
    }

    // 3. PREEMPTIVE CSS INJECTION: Disable animations and force visibility BEFORE scrolling
    // This prevents animations from running and ensures elements are visible during scroll
    await page.addStyleTag({
      content: `
        /* 1. Stop all animations and transitions immediately */
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
          scroll-behavior: auto !important;
          caret-color: transparent !important; /* Hide cursors */
        }

        /* 2. Force visibility on common animation/lazy-load classes */
        [data-aos], .aos-animate, .reveal, .fade-in, .lazyload, .lazyloaded,
        [style*="opacity: 0"], [style*="transform: translate"], [style*="transform: scale(0)"],
        .animate-on-scroll, .scroll-animation, .scroll-reveal, .waypoint,
        .fade-in-up, .fade-in-down, .fade-in-left, .fade-in-right,
        .slide-in-up, .slide-in-down, .slide-in-left, .slide-in-right,
        .zoom-in, .zoom-out, .bounce-in, .flip-in {
          opacity: 1 !important;
          visibility: visible !important;
          transform: none !important; /* Reset any slide-in transforms */
          animation-fill-mode: forwards !important;
        }

        /* 3. Force visibility on elements that might be hidden by scroll libraries */
        .hidden, .invisible, [hidden], [aria-hidden="true"] {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }

        /* 4. Override common scroll animation frameworks */
        [data-scroll], [data-scroll-class], [data-scroll-direction],
        .scrollmagic, .gsap, .tweenmax, .anime, .velocity {
          opacity: 1 !important;
          visibility: visible !important;
          transform: none !important;
        }

        /* 5. Ensure body/html height is correct for full page capture */
        html, body {
            height: auto !important;
            min-height: 100% !important;
            overflow-y: visible !important;
            overflow-x: hidden !important;
        }

        /* 6. Force all potentially animated elements to be visible */
        .animated, .animation, .anim, .motion, .transition,
        [class*="anim"], [class*="motion"], [class*="fade"], [class*="slide"],
        [class*="zoom"], [class*="bounce"], [class*="flip"] {
          opacity: 1 !important;
          visibility: visible !important;
          transform: none !important;
          animation-play-state: paused !important;
        }

        /* VERIFICATION: Add a test element to confirm CSS injection */
        .smart-scraper-verification {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: fixed !important;
          top: -9999px !important;
          left: -9999px !important;
          z-index: -9999 !important;
        }
      `,
    });

    // VERIFY CSS INJECTION: Check if our CSS was applied correctly
    const cssVerification = await page.evaluate(() => {
      // Create a test element
      const testEl = document.createElement("div");
      testEl.className = "smart-scraper-verification";
      testEl.textContent = "CSS_INJECTED";
      document.body.appendChild(testEl);

      // Check if our CSS rules are applied
      const computedStyle = window.getComputedStyle(testEl);
      const isVisible =
        computedStyle.display === "block" &&
        computedStyle.visibility === "visible" &&
        computedStyle.opacity === "1";

      // Check if animations are disabled globally
      const bodyStyle = window.getComputedStyle(document.body);
      const animationsDisabled = bodyStyle.animation === "none";

      // Clean up
      document.body.removeChild(testEl);

      return {
        cssInjected: isVisible,
        animationsDisabled: animationsDisabled,
        bodyOverflow: bodyStyle.overflowY,
        htmlHeight: window.getComputedStyle(document.documentElement).height,
      };
    });

    console.log("[Smart Scraper] CSS Injection Verification:", cssVerification);

    if (!cssVerification.cssInjected) {
      console.warn("[Smart Scraper] WARNING: CSS injection may have failed!");
    }

    if (!cssVerification.animationsDisabled) {
      console.warn("[Smart Scraper] WARNING: Animations may not be disabled!");
    }

    // 4. SCROLL WITH ANIMATIONS DISABLED: Trigger Lazy Loading (Essential for Images)
    if (!skipScrolling) {
      console.log(
        "[Smart Scraper] Scrolling to trigger lazy load (animations already disabled)..."
      );

      // First pass: Scroll down in smaller chunks with waits for lazy loading
      await page.evaluate(async () => {
        const totalHeight = document.body.scrollHeight;
        let currentPosition = 0;
        const viewportHeight = window.innerHeight;
        const scrollStep = viewportHeight * 0.8; // 80% of viewport for overlap

        console.log(
          `[Scroll Pass 1] Total height: ${totalHeight}px, Step: ${scrollStep}px`
        );

        // Scroll down in smaller chunks
        while (currentPosition < totalHeight) {
          window.scrollBy(0, scrollStep);
          currentPosition += scrollStep;
          // Wait for lazy loading to trigger (animations are already disabled)
          await new Promise((r) => setTimeout(r, 300));
        }

        // Scroll back to top
        window.scrollTo(0, 0);
        // Wait for top to settle
        await new Promise((r) => setTimeout(r, 1000));
      });

      // Second pass: Scroll down again to catch any missed lazy loading
      console.log(
        "[Smart Scraper] Second scroll pass for missed lazy loading..."
      );
      await page.evaluate(async () => {
        const totalHeight = document.body.scrollHeight;
        let currentPosition = 0;
        const viewportHeight = window.innerHeight;
        const scrollStep = viewportHeight * 0.5; // Even smaller steps

        console.log(
          `[Scroll Pass 2] Total height: ${totalHeight}px, Step: ${scrollStep}px`
        );

        while (currentPosition < totalHeight) {
          window.scrollBy(0, scrollStep);
          currentPosition += scrollStep;
          // Wait for lazy components
          await new Promise((r) => setTimeout(r, 500));
        }

        // Final scroll to bottom to ensure everything is loaded
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((r) => setTimeout(r, 1000));

        // Scroll back to top one final time
        window.scrollTo(0, 0);
      });

      // Wait for all lazy components to complete loading
      console.log(
        "[Smart Scraper] Waiting for all lazy components to settle..."
      );
      await new Promise((r) => setTimeout(r, 2000));
    }

    // 5. WAIT FOR NETWORK IDLE (Ensure images triggered by scroll are done)
    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 });
    } catch {
      console.log("[Smart Scraper] Network wait timeout (proceeding).");
    }

    // 6. EXTRACT ELEMENTS (Now that DOM is stable)
    const elementMap = await page.evaluate(() => {
      const getSelector = (el) => {
        if (el.tagName === "BODY") return "BODY";
        const parent = el.parentElement;
        if (!parent) return el.tagName;
        const children = Array.from(parent.children);
        const index = children.indexOf(el) + 1;
        return `${getSelector(parent)} > ${el.tagName}:nth-child(${index})`;
      };

      const elements = document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"]'
      );

      const mapData = [];
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          mapData.push({
            selector: getSelector(el),
            tag: el.tagName,
            text: (el.innerText || "").substring(0, 50),
            x: Math.round(rect.left + window.scrollX),
            y: Math.round(rect.top + window.scrollY),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            href: el.href || null,
          });
        }
      });
      return mapData;
    });

    console.log(
      `[Smart Scraper] Found ${elementMap.length} interactive elements.`
    );

    // 7. TAKE SCREENSHOT
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: true, // Puppeteer handles the scrolling/stitching
      captureBeyondViewport: true,
    });

    await browser.close();

    // Normalize path for filename (match frontend expectations)
    let normalizedPath =
      pagePath === "/"
        ? "homepage"
        : pagePath.startsWith("/")
        ? pagePath.slice(1)
        : pagePath;
    const imagePath = `${siteId}/${normalizedPath}-${finalDeviceType}.png`;

    // Upload screenshot to Supabase
    console.log(`[Smart Scraper] Uploading screenshot to: ${imagePath}`);
    const { error: uploadError } = await supabaseAdmin.storage
      .from("screenshots")
      .upload(imagePath, screenshotBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Smart Scraper] Screenshot upload error:", uploadError);
      return res
        .status(500)
        .json({ error: `Failed to upload screenshot: ${uploadError.message}` });
    }

    // Upload elements JSON if we have elements
    if (elementMap && elementMap.length > 0) {
      const jsonPath = `${siteId}/${normalizedPath}-${finalDeviceType}.json`;
      const jsonString = JSON.stringify(elementMap);
      const jsonBuffer = Buffer.from(jsonString, "utf-8");

      console.log(
        `[Smart Scraper] Uploading elements JSON to: ${jsonPath} (${jsonString.length} bytes)`
      );
      const { error: jsonError } = await supabaseAdmin.storage
        .from("screenshots")
        .upload(jsonPath, jsonBuffer, {
          contentType: "application/json",
          upsert: true,
        });

      if (jsonError) {
        console.error("[Smart Scraper] JSON upload failed:", jsonError);
        console.error("[Smart Scraper] JSON error details:", {
          message: jsonError.message,
          statusCode: jsonError.statusCode,
          error: jsonError.error,
        });
      } else {
        console.log("[Smart Scraper] Elements JSON uploaded successfully");
      }
    } else {
      console.log("[Smart Scraper] No elements found, skipping JSON upload");
    }

    // Get public URL for the uploaded screenshot
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("screenshots")
      .getPublicUrl(imagePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("[Smart Scraper] Failed to get public URL for:", imagePath);
      return res
        .status(500)
        .json({ error: "Failed to generate public URL for screenshot" });
    }

    console.log(
      `[Smart Scraper] Screenshot uploaded successfully. Public URL: ${publicUrlData.publicUrl}`
    );

    // Return the public URL and elements (no more base64!)
    return res.json({
      success: true,
      publicUrl: publicUrlData.publicUrl,
      elements: elementMap,
      elementCount: elementMap.length,
    });
  } catch (error) {
    console.error("[Smart Scraper] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return res.status(500).json({ error: errorMessage });
  }
});

// ANALYTICS ENDPOINT (keep this separate)
app.post("/api/v1/ingest", async (req, res) => {
  try {
    const { events, siteId } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: "Invalid events data" });
    }

    // Process analytics events (send to ClickHouse or your database)
    console.log(`Received ${events.length} events for site ${siteId}`);

    // Add your ClickHouse insertion logic here
    // const result = await insertIntoClickHouse(events);

    res.json({ success: true, processed: events.length });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to process analytics" });
  }
});

// ✅ FIXED: Use port 3000 for Replit
app.listen(3000, () => console.log("🔥 API running on port 3000"));
