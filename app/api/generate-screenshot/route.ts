import { createClient } from '@supabase/supabase-js';
import { url } from 'inspector';
import { NextRequest, NextResponse } from 'next/server';

// Lazy initialize Supabase admin client to avoid errors at build time
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdminClient() {
    if (!supabaseAdmin) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) {
            throw new Error('Missing Supabase environment variables');
        }
        supabaseAdmin = createClient(url, key);
    }
    return supabaseAdmin;
}

export async function POST(req: NextRequest) {
    try {
        const { pageUrlToScreenshot, siteId, pagePath } = await req.json();

        console.log(`Backend: Parsed pageUrlToScreenshot: ${pageUrlToScreenshot}`);
        console.log(`Backend: Parsed siteId: ${siteId}`);
        console.log(`Backend: Parsed pagePath: ${pagePath}`);
        console.log(`Backend: Type of pageUrlToScreenshot: ${typeof pageUrlToScreenshot}`);
        console.log(`Backend: Type of siteId: ${typeof siteId}`);
        console.log(`Backend: Type of pagePath: ${typeof pagePath}`);

        if (!pageUrlToScreenshot || !siteId || !pagePath) {
            const missingParams = [];
            if (!pageUrlToScreenshot) missingParams.push('pageUrlToScreenshot');
            if (!siteId) missingParams.push('siteId');
            if (!pagePath) missingParams.push('pagePath');
            return NextResponse.json({ error: `Missing required parameters: ${missingParams.join(', ')}` }, { status: 400 });
        }

        // Validate that pageUrlToScreenshot is a valid URL
        try {
            new URL(pageUrlToScreenshot);
        } catch (e) {
            return NextResponse.json({ error: `Invalid URL format: ${pageUrlToScreenshot}` }, { status: 400 });
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

        const urlForApiFlash = "https://www.google.com/"; // <--- CHANGE THIS LINE
        console.log(`Backend: Temporarily forcing API Flash to screenshot: ${urlForApiFlash}`);
        // Construct the request body for API Flash
        const apiFlashBody = {
            url: urlForApiFlash,
            full_page: true,
            format: 'png',
            quality: 95,
            width: 1920,
            height: 1080,
            device_scale_factor: 2,
            response_type: 'json',
            delay: 2000,
        };
        console.log("API Flash request body:", JSON.stringify(apiFlashBody));
        console.log("URL being sent to API Flash:", pageUrlToScreenshot);

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

        const supabase = getSupabaseAdminClient();
        const { error: uploadError } = await supabase.storage
            .from('screenshots')
            .upload(filePath, screenshotBuffer, {
                contentType: 'image/png',
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Supabase upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
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