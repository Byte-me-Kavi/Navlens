import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';

export const runtime = "nodejs";
export const preferredRegion = "iad1";

// Increase timeout for this route because launching a browser takes time
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Browserless configuration
const BROWSERLESS_ENDPOINT = "https://production-sfo.browserless.io/chromium/bql";
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;

// Device viewports with proper mobile emulation (matching your frontend profiles)
const DEVICE_PROFILES = {
    desktop: { 
        width: 1440, 
        height: 1080,
    },
    tablet: { 
        width: 768, 
        height: 1024,
    },
    mobile: { 
        width: 375, 
        height: 812, // iPhone X dimensions for better mobile experience
    },
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

        // 1. Use Browserless GraphQL API
        console.log('[Smart Scraper] Starting Browserless request for', pageUrlToScreenshot);

        const graphqlQuery = `
        mutation ScrapePage($url: String!, $width: Int!, $height: Int!) {
          goto(url: $url, waitUntil: networkidle2) {
            status
          }
          setViewport(width: $width, height: $height) {
            success
          }
          evaluate(expression: """
            (() => {
              const elements = document.querySelectorAll('button, a, input, select, textarea, label, option, summary, details, img, [contenteditable], [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="slider"], [role="textbox"], div[onclick], span[onclick], *[style*="cursor:pointer"], svg, svg *, video, audio, canvas');
              return elements.map(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  return {
                    selector: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''),
                    tag: el.tagName,
                    text: el.innerText?.substring(0, 50) || '',
                    x: Math.round(rect.x + window.scrollX),
                    y: Math.round(rect.y + window.scrollY),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    href: el.href || null
                  };
                }
                return null;
              }).filter(Boolean);
            })()
          """) {
            result
          }
          screenshot(type: png, fullPage: true) {
            base64
          }
        }`;

        const response = await fetch(`${BROWSERLESS_ENDPOINT}?token=${BROWSERLESS_TOKEN}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: graphqlQuery,
            variables: {
              url: pageUrlToScreenshot,
              width: device.width,
              height: device.height,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Browserless API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[Smart Scraper] Browserless response received');

        const screenshotBase64 = data.data.screenshot.base64;
        const elementMap = JSON.parse(data.data.evaluate.result);

        console.log(`[Smart Scraper] Found ${elementMap.length} interactive elements.`);

        // Convert base64 to buffer
        const screenshotBuffer = Buffer.from(screenshotBase64, 'base64');

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