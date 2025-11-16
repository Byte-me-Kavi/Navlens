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

        const API_FLASH_KEY = process.env.API_FLASH_KEY;

        if (!API_FLASH_KEY) {
            console.error("API_FLASH_KEY environment variable is not defined.");
            throw new Error("API Flash Key is missing. Please set API_FLASH_KEY environment variable.");
        }

        // --- API Flash endpoint with access_key as a query parameter ---
        const apiFlashUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${API_FLASH_KEY}`;
        console.log("API Flash URL being used (with key):", apiFlashUrl); // Debugging: Check the full URL

        // Construct the request body for API Flash (WITHOUT the access_key here)
        const apiFlashBody = {
            url: pageUrlToScreenshot,
            full_page: true,
            format: 'png',
            quality: 95,
            width: 1920,
            height: 1080,
            device_scale_factor: 2,
            response_type: 'json',
            delay: 2000,
            // You can add waitUntil here as well, e.g., 'networkidle0'
            // wait_until: 'page_loaded', // This is also valid for API Flash
        };
        console.log("API Flash request body:", JSON.stringify(apiFlashBody));

        const response = await fetch(apiFlashUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiFlashBody),
        });

        if (!response.ok) {
            const errorText = await response.text(); // Read as text first
            console.error('API Flash raw error response text:', errorText);
            
            let errorMessage = errorText;
            try {
                const errorDetails = JSON.parse(errorText); // Try parsing as JSON
                errorMessage = errorDetails.message || errorText;
            } catch (jsonError) {
                // Not JSON, use original text
                console.warn("API Flash error response was not JSON. Using plain text.");
            }
            throw new Error(`API Flash failed with status ${response.status}: ${errorMessage}`);
        }

        const apiFlashResult = await response.json(); // Now this should be valid JSON
        const imageUrl = apiFlashResult.url;

        if (!imageUrl) {
            throw new Error("API Flash did not return an image URL in its JSON response.");
        }

        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image from API Flash URL (${imageUrl}): ${imageResponse.status}`);
        }
        const screenshotBuffer = await imageResponse.arrayBuffer();

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