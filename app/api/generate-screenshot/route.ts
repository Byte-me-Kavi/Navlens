import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { validators } from '@/lib/validation';

// Increase timeout for this route because launching a browser takes time
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Device viewports with proper mobile emulation (matching your frontend profiles)
const DEVICE_PROFILES = {
    desktop: { 
        width: 1440, 
        height: 1080,
        isMobile: false,
        hasTouch: false,
        deviceScaleFactor: 1
    },
    tablet: { 
        width: 768, 
        height: 1024,
        isMobile: false,
        hasTouch: true,
        deviceScaleFactor: 1
    },
    mobile: { 
        width: 375, 
        height: 812, // iPhone X dimensions for better mobile experience
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3 // Retina display quality
    },
};

// Mobile user agents for proper emulation
const MOBILE_USER_AGENTS = {
    mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    tablet: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

export async function POST(req: NextRequest) {
    try {
        const { pageUrlToScreenshot, siteId, pagePath, deviceType } = await req.json();

        // Comprehensive input validation
        if (!pageUrlToScreenshot || typeof pageUrlToScreenshot !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid pageUrlToScreenshot' }, { status: 400 });
        }

        if (!siteId || typeof siteId !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid siteId' }, { status: 400 });
        }

        // Validate URL format
        if (!validators.isValidURL(pageUrlToScreenshot)) {
            return NextResponse.json({ error: 'Invalid URL format for pageUrlToScreenshot' }, { status: 400 });
        }

        // Validate siteId format (UUID)
        if (!validators.isValidUUID(siteId)) {
            return NextResponse.json({ error: 'Invalid siteId format' }, { status: 400 });
        }

        // Validate and sanitize pagePath if provided
        if (pagePath) {
            if (typeof pagePath !== 'string') {
                return NextResponse.json({ error: 'Invalid pagePath format' }, { status: 400 });
            }
            if (!validators.isValidPagePath(pagePath)) {
                return NextResponse.json({ error: 'Invalid pagePath format' }, { status: 400 });
            }
        }

        // Validate deviceType
        const validDeviceTypes = ['desktop', 'tablet', 'mobile'];
        const finalDeviceType = validDeviceTypes.includes(deviceType) ? deviceType : 'desktop';

        const device = DEVICE_PROFILES[finalDeviceType as keyof typeof DEVICE_PROFILES] || DEVICE_PROFILES.desktop;
        console.log(`[Smart Scraper] Starting for ${pageUrlToScreenshot} on ${finalDeviceType}`);

        // 1. Launch Browser (The "Pro" Move)
        // We use sparticuz/chromium for production (Vercel) and local chrome for dev
        let browser;
        
        if (process.env.NODE_ENV === 'production') {
            // Production: Use the lightweight chromium binary
            browser = await puppeteer.launch({
                args: chromium.args,
                defaultViewport: device,
                executablePath: await chromium.executablePath(),
                headless: true, // Always headless in production
            });
        } else {
            // Local Dev: Use your local Chrome installation
            // You might need to adjust this path based on your OS (Windows/Mac)
            // Common Windows path: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            browser = await puppeteer.launch({
                args: [],
                defaultViewport: device,
                executablePath: process.env.LOCAL_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                headless: true,
            });
        }

        const page = await browser.newPage();
        
        // Apply device-specific emulation for proper mobile behavior
        const deviceProfile = DEVICE_PROFILES[deviceType as keyof typeof DEVICE_PROFILES] || DEVICE_PROFILES.desktop;
        const userAgent = MOBILE_USER_AGENTS[deviceType as keyof typeof MOBILE_USER_AGENTS] || MOBILE_USER_AGENTS.desktop;
        
        await page.setViewport(deviceProfile);
        await page.setUserAgent(userAgent);
        
        // 2. Navigate to page with proper wait conditions
        await page.goto(pageUrlToScreenshot, { 
            waitUntil: 'networkidle0', // Wait for network to be idle
            timeout: 30000 // 30 second timeout
        });
        
        // Additional wait for mobile devices to ensure dynamic content loads
        if (deviceType === 'mobile') {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second additional wait for mobile-specific content
        }

        // Ensure page is scrolled to top before taking screenshot
        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });

        // Wait a bit for any scroll-triggered content to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Log page dimensions for debugging
        const pageDimensions = await page.evaluate(() => ({
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: document.documentElement.clientHeight,
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth
        }));
        console.log(`[Smart Scraper] Page dimensions:`, pageDimensions);

        // 3. Inject Logic: Extract the "Smart Map" (DOM Elements)
        // This runs INSIDE the browser page
        const elementMap = await page.evaluate(() => {
            // Helper to generate unique CSS selector
            const getSelector = (el: Element): string => {
                if (el.tagName === "BODY") return "BODY";
                const parent = el.parentElement;
                if (!parent) return el.tagName;
                const children = Array.from(parent.children);
                const index = children.indexOf(el) + 1;
                return `${getSelector(parent)} > ${el.tagName}:nth-child(${index})`;
            };

            const elements = document.querySelectorAll('button, a, input, select, textarea, label, option, summary, details, img, [contenteditable], [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="slider"], [role="textbox"], div[onclick], span[onclick], *[style*="cursor:pointer"], svg, svg *, video, audio, canvas');
            const mapData: Array<{
                selector: string;
                tag: string;
                text: string;
                x: number;
                y: number;
                width: number;
                height: number;
                href: string | null;
            }> = [];

            elements.forEach((el) => {
                const rect = el.getBoundingClientRect();
                // Only capture elements that are visible and have size
                if (rect.width > 0 && rect.height > 0) {
                    mapData.push({
                        selector: getSelector(el),
                        tag: el.tagName,
                        text: ((el as HTMLElement).innerText || "").substring(0, 50), // Capture text for context
                        x: Math.round(rect.x + window.scrollX), // Absolute X
                        y: Math.round(rect.y + window.scrollY), // Absolute Y
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        href: (el as HTMLAnchorElement).href || null
                    });
                }
            });
            return mapData;
        });

        console.log(`[Smart Scraper] Found ${elementMap.length} interactive elements.`);

        // 4. Take the Screenshot with device-specific options
        const screenshotOptions = {
            type: 'png' as const,
            fullPage: true, // Always capture full page for complete mobile experience
            // Note: PNG format doesn't support quality parameter (always lossless)
            // Quality parameter is only for JPEG format
        };
        
        const screenshotBuffer = await page.screenshot(screenshotOptions);

        await browser.close();

        // 5. Upload Screenshot to Supabase
        // Normalize path for filename (match frontend expectations)
        let normalizedPath: string;
        if (pagePath === "/") {
            normalizedPath = "homepage";
        } else if (pagePath.startsWith("/")) {
            normalizedPath = pagePath.slice(1); // Remove leading slash
        } else if (pagePath.startsWith(".")) {
            normalizedPath = pagePath.slice(1); // Remove leading dot
        } else {
            normalizedPath = pagePath;
        }
        
        const imagePath = `${siteId}/${normalizedPath}-${deviceType}.png`;
        
        const { error: imgError } = await supabaseAdmin.storage
            .from('screenshots')
            .upload(imagePath, screenshotBuffer, { contentType: 'image/png', upsert: true });

        if (imgError) throw new Error(`Image Upload Failed: ${imgError.message}`);

        // 6. Upload "Smart Map" JSON to Supabase
        const jsonPath = `${siteId}/${normalizedPath}-${deviceType}.json`;
        const jsonBuffer = Buffer.from(JSON.stringify(elementMap, null, 2), 'utf-8');

        const { error: jsonError } = await supabaseAdmin.storage
            .from('screenshots') // We can store JSON in the same bucket
            .upload(jsonPath, jsonBuffer, { contentType: 'application/json', upsert: true });

        if (jsonError) throw new Error(`JSON Map Upload Failed: ${jsonError.message}`);

        // 7. Return Success
        const { data: publicUrlData } = supabaseAdmin.storage.from('screenshots').getPublicUrl(imagePath);

        return NextResponse.json({ 
            success: true, 
            publicUrl: publicUrlData.publicUrl,
            elementCount: elementMap.length 
        });

    } catch (error: unknown) {
        console.error('[Smart Scraper] Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}