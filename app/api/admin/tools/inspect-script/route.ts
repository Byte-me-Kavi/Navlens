
import { NextRequest, NextResponse } from 'next/server';
import { withMonitoring } from "@/lib/api-middleware";

export const dynamic = 'force-dynamic';

async function POST_handler(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Validate URL format
        let targetUrl = url;
        if (!targetUrl.startsWith('http')) {
            targetUrl = `https://${targetUrl}`;
        }

        console.log(`[Inspector] Checking ${targetUrl}...`);

        // Fetch the page content
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(targetUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Navlens-Inspector/1.0',
                },
                cache: 'no-store'
            });
            clearTimeout(timeout);

            if (!response.ok) {
                return NextResponse.json({
                    connected: false,
                    details: `Failed to fetch page: ${response.status} ${response.statusText}`
                });
            }

            const html = await response.text();

            // Check for script
            // Looking for src=".../tracker.js" or "navlens.js" or data-site-id
            // Also checking if it is the new script format

            // Regex to find script tags with specific filenames
            // Matches src=".../tracker.js" OR src="tracker.js"
            const trackerRegex = /src=['"](.*?)(\/)?(tracker\.js|navlens\.js|dev-tracker\.js)(.*?)['"]/i;
            const match = html.match(trackerRegex);
            const hasTracker = !!match;

            const hasSiteId = /data-site-id=['"]([a-zA-Z0-9-]+)['"]/.test(html);

            // Log for debugging
            console.log(`[Inspector] Result for ${targetUrl}: hasTracker=${hasTracker}, hasSiteId=${hasSiteId}, match=${match ? match[0] : 'null'}`);

            if (hasTracker) {
                return NextResponse.json({
                    connected: true,
                    details: '✅ Script found! Tracking should be active.',
                    has_site_id: hasSiteId
                });
            } else if (hasSiteId) {
                return NextResponse.json({
                    connected: false, // Semi-failure
                    details: '⚠️ Site ID found, but the script file (tracker.js) was not detected in the `src` attribute. Check your file name.',
                    has_site_id: true
                });
            } else {
                return NextResponse.json({
                    connected: false,
                    details: '❌ Script NOT found in the HTML source. Make sure it is in the <head> or <body>.'
                });
            }

        } catch (fetchError: any) {
            clearTimeout(timeout);
            return NextResponse.json({
                connected: false,
                details: `Network error: ${fetchError.message}`
            });
        }

    } catch (error: any) {
        console.error('[Inspector] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const POST = withMonitoring(POST_handler);
