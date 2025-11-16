// app/api/generate-screenshot/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { pageUrlToScreenshot, siteId, pagePath } = await req.json();

        if (!pageUrlToScreenshot || !siteId || !pagePath) {
            return NextResponse.json({ error: 'Missing required parameters: pageUrlToScreenshot, siteId, pagePath' }, { status: 400 });
        }

        console.log(`Generating screenshot for: ${pageUrlToScreenshot}`);

        // --- Use BROWSERLESS_TOKEN consistently ---
        const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN; 

        if (!BROWSERLESS_TOKEN) {
            console.error("BROWSERLESS_TOKEN environment variable is not defined.");
            throw new Error("Browserless API Key (BROWSERLESS_TOKEN) is missing. Please set it as an environment variable.");
        }

        // --- CORRECT BROWSERLESS URL CONSTRUCTION ---
        // Pass the API key as a query parameter in the URL for the function/screenshot endpoint
        const browserlessUrl = `https://api.browserless.io/function/screenshot?token=${BROWSERLESS_TOKEN}`;
        console.log("Browserless API URL being used:", browserlessUrl); // For debugging purposes

        const response = await fetch(browserlessUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // REMOVE the Authorization header here, as the token is in the URL
                // 'Authorization': `Bearer ${BROWSERLESS_TOKEN}`, 
            },
            body: JSON.stringify({
                url: pageUrlToScreenshot,
                options: { // All screenshot options are correctly nested here
                    fullPage: true,
                    type: 'png',
                    quality: 95,
                    deviceScaleFactor: 2,
                    timeout: 30000,
                    viewport: {
                        width: 1920,
                        height: 1080,
                    },
                    ignoreHTTPSErrors: true,
                    // waitUntil: 'networkidle0', 
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Browserless raw error:', errorText);
            throw new Error(`Browserless API failed with status ${response.status}: ${errorText}`);
        }

        const screenshotBuffer = await response.arrayBuffer();

        const filePath = `${siteId}/${encodeURIComponent(pagePath)}.png`;
        console.log(`Uploading screenshot to Supabase at: ${filePath}`);

        const { error: uploadError } = await supabaseAdmin.storage
            .from('screenshots')
            .upload(filePath, screenshotBuffer, {
                contentType: 'image/png',
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabaseAdmin.storage
            .from('screenshots')
            .getPublicUrl(filePath);

        if (!publicUrlData) {
            throw new Error('Could not get public URL from Supabase.');
        }

        console.log(`Screenshot successful: ${publicUrlData.publicUrl}`);
        return NextResponse.json({ publicUrl: publicUrlData.publicUrl });

    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error generating screenshot:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}