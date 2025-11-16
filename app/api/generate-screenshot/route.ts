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

        // --- API Flash specific setup ---
        const API_FLASH_KEY = process.env.API_FLASH_KEY;

        if (!API_FLASH_KEY) {
            console.error("API_FLASH_KEY environment variable is not defined.");
            throw new Error("API Flash Key is missing. Please set API_FLASH_KEY environment variable.");
        }

        // API Flash endpoint
        const apiFlashUrl = `https://api.apiflash.com/v1/urltoimage`;

        // Construct the request body for API Flash
        const apiFlashBody = {
            access_key: API_FLASH_KEY, // API Flash uses 'access_key'
            url: pageUrlToScreenshot,
            full_page: true,          // Equivalent to Browserless 'fullPage'
            format: 'png',            // Equivalent to Browserless 'type'
            quality: 95,              // Standard quality setting
            width: 1920,              // Viewport width
            height: 1080,             // Viewport height
            device_scale_factor: 2,   // Equivalent to Browserless 'deviceScaleFactor'
            response_type: 'json',    // Request JSON response to get the URL
            delay: 2000,              // Optional: wait 2 seconds for page to load JS/data
            // Additional API Flash options you might want to add later:
            // no_cookie_banners: true,
            // no_ads: true,
            // user_agent: '...',
            // viewport: '1920x1080', // You can also pass viewport as string if preferred
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
            const errorDetails = await response.json(); // API Flash often returns JSON errors
            console.error('API Flash raw error:', JSON.stringify(errorDetails, null, 2));
            throw new Error(`API Flash failed with status ${response.status}: ${errorDetails.message || 'Unknown error'}`);
        }

        // API Flash, when response_type: 'json', returns a JSON object with a 'url' to the image
        const apiFlashResult = await response.json();
        const imageUrl = apiFlashResult.url;

        if (!imageUrl) {
            throw new Error("API Flash did not return an image URL.");
        }

        // Fetch the actual image from the URL provided by API Flash
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image from API Flash URL: ${imageResponse.status}`);
        }
        const screenshotBuffer = await imageResponse.arrayBuffer();

        // ... (Rest of your Supabase upload logic remains the same) ...

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