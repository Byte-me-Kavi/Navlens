import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Lazy initialize Supabase admin client to avoid errors at build time
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

function getSupabaseAdminClient() {
    if (!supabaseAdmin) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !key) {
            throw new Error('Missing Supabase environment variables');
        }
        supabaseAdmin = createClient(supabaseUrl, key);
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

        // --- API Flash endpoint with access_key and url as query parameters ---
        const encodedUrl = encodeURIComponent(pageUrlToScreenshot);
        const apiFlashUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${API_FLASH_KEY}&url=${encodedUrl}&format=png&width=1920&height=1080&full_page=true&fresh=true&response_type=json`;
        
        console.log("API Flash URL being called:", apiFlashUrl.replace(API_FLASH_KEY, '***'));

        const response = await fetch(apiFlashUrl, {
            method: 'GET', // API Flash uses GET, not POST
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

        // Don't encode pagePath - Supabase will handle it correctly
        const filePath = `${siteId}/${pagePath.replace(/^\//, '')}.png`;
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