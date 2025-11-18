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
const BROWSERLESS_ENDPOINT = "https://production-sfo.browserless.io";
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;

// Device viewports with proper mobile emulation (matching your frontend profiles)
const DEVICE_PROFILES = {
    desktop: { 
        width: 1470, 
        height: 1070,
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

        // 1. Use Browserless REST API
        console.log('[Smart Scraper] Starting Browserless request for', pageUrlToScreenshot);

        const functionCode = `
          export default async function ({ page }) {
            try {
              await page.setViewport({ width: ${device.width}, height: ${device.height} });
              await page.goto('${pageUrlToScreenshot}', { waitUntil: 'networkidle2' });

              // Trigger scroll animations and lazy loading
              await page.evaluate(async () => {
                const scrollHeight = document.body.scrollHeight;
                const viewportHeight = window.innerHeight;
                
                // Scroll down in steps to trigger animations
                for (let y = 0; y < scrollHeight; y += viewportHeight / 2) {
                  window.scrollTo(0, y);
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // Scroll back to top
                window.scrollTo(0, 0);
                await new Promise(resolve => setTimeout(resolve, 500));
              });

              const elements = await page.evaluate(() => {
                const getSelector = (el) => {
                  if (el.tagName === "BODY") return "BODY";
                  const parent = el.parentElement;
                  if (!parent) return el.tagName;
                  const children = Array.from(parent.children);
                  const index = children.indexOf(el) + 1;
                  return getSelector(parent) + " > " + el.tagName + ":nth-child(" + index + ")";
                };

                const elements = document.querySelectorAll('button, a, input, select, textarea, label, option, summary, details, img, [contenteditable], [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="slider"], [role="textbox"], div[onclick], span[onclick], *[style*="cursor:pointer"], svg, svg *, video, audio, canvas');
                console.log('Found ' + elements.length + ' raw elements');
                
                const processedElements = Array.from(elements).map(el => {
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    return {
                      selector: getSelector(el),
                      tag: el.tagName,
                      text: (el.innerText || '').substring(0, 50),
                      x: Math.round(rect.x + window.scrollX),
                      y: Math.round(rect.y + window.scrollY),
                      width: Math.round(rect.width),
                      height: Math.round(rect.height),
                      href: el.href || null
                    };
                  }
                  return null;
                }).filter(Boolean);
                
                console.log('Processed ' + processedElements.length + ' valid elements');
                return processedElements;
              });

              const screenshot = await page.screenshot({ 
                fullPage: true, 
                type: 'png', 
                encoding: 'base64' 
              });

              console.log('Function completed: ' + elements.length + ' elements, screenshot length: ' + screenshot.length);

              return {
                data: {
                  screenshot: screenshot,
                  elements: elements
                },
                type: 'application/json'
              };
            } catch (error) {
              console.error('Function error:', error);
              return {
                data: {
                  screenshot: '',
                  elements: [],
                  error: error.message
                },
                type: 'application/json'
              };
            }
          }
        `;        const response = await fetch(`${BROWSERLESS_ENDPOINT}/function?token=${BROWSERLESS_TOKEN}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/javascript',
          },
          body: functionCode,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Smart Scraper] Browserless error response:', errorText);
          throw new Error(`Browserless API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('[Smart Scraper] Browserless response received');
        console.log('[Smart Scraper] Response structure:', JSON.stringify(data, null, 2));

        const screenshotBase64 = data.data.screenshot;
        const elementMap = data.data.elements;

        console.log(`[Smart Scraper] Screenshot base64 length: ${screenshotBase64?.length || 0}`);
        console.log(`[Smart Scraper] Elements found: ${elementMap?.length || 0}`);
        console.log(`[Smart Scraper] First element sample:`, elementMap?.[0]);

        if (!screenshotBase64 || screenshotBase64.length === 0) {
          throw new Error('Screenshot generation failed - no base64 data received');
        }

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
        
        if (!elementMap || !Array.isArray(elementMap) || elementMap.length === 0) {
          console.error('[Smart Scraper] No elements found, cannot create JSON map');
          throw new Error('No interactive elements found on the page');
        }
        
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