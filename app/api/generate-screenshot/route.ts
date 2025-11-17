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
            const { siteId, pagePath, deviceType } = await req.json();

            console.log(`Backend: Parsed siteId: ${siteId}`);
            console.log(`Backend: Parsed pagePath: ${pagePath}`);
            console.log(`Backend: Parsed deviceType: ${deviceType}`);

            if (!siteId || !pagePath) {
                const missingParams = [];
                if (!siteId) missingParams.push('siteId');
                if (!pagePath) missingParams.push('pagePath');
                return NextResponse.json({ error: `Missing required parameters: ${missingParams.join(', ')}` }, { status: 400 });
            }

            // Fetch the site domain from database using siteId
            const supabase = getSupabaseAdminClient();
            const { data: siteData, error: siteError } = await supabase
                .from('sites')
                .select('domain')
                .eq('id', siteId)
                .single();

            if (siteError || !siteData) {
                console.error('Error fetching site domain:', siteError);
                return NextResponse.json({ error: `Site not found: ${siteId}` }, { status: 404 });
            }

            const pageUrlToScreenshot = (siteData as { domain: string }).domain;
            console.log(`Backend: Retrieved domain from database: ${pageUrlToScreenshot}`);

            // Validate that pageUrlToScreenshot is a valid URL
            try {
                new URL(pageUrlToScreenshot);
            } catch {
                return NextResponse.json({ error: `Invalid URL format: ${pageUrlToScreenshot}` }, { status: 400 });
            }

            console.log(`Generating screenshot for: ${pageUrlToScreenshot}`);

            const API_FLASH_KEY = process.env.API_FLASH_KEY;

            if (!API_FLASH_KEY) {
                console.error("API_FLASH_KEY environment variable is not defined.");
                throw new Error("API Flash Key is missing. Please set API_FLASH_KEY environment variable.");
            }

            // Define device profiles with viewport dimensions and user agents
            const deviceProfiles: Record<string, { width: number; height: number; userAgent: string }> = {
              desktop: { 
                width: 1440, 
                height: 1080,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              },
              tablet: { 
                width: 768, 
                height: 1024,
                userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
              },
              mobile: { 
                width: 375, 
                height: 667,
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
              },
            };

            const device = deviceProfiles[deviceType || 'desktop'] || deviceProfiles.desktop;

            // --- API Flash endpoint with viewport dimensions and user agent ---
            const encodedUrl = encodeURIComponent(pageUrlToScreenshot);
            const encodedUserAgent = encodeURIComponent(device.userAgent);
            const antiAnimationCSS = `
            * { 
                opacity: 1 !important; 
                visibility: visible !important; 
                transform: none !important; 
                transition: none !important; 
                animation: none !important; 
            }
        `;
            const apiFlashUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${API_FLASH_KEY}&url=${encodedUrl}&format=png&width=${device.width}&height=${device.height}&full_page=true&fresh=true&response_type=json&scroll=true&css=${encodeURIComponent(antiAnimationCSS)}&user_agent=${encodedUserAgent}`;
            
            console.log("API Flash URL being called:", apiFlashUrl.replace(API_FLASH_KEY, '***'));
            console.log(`Using device profile: ${deviceType || 'desktop'} (${device.width}x${device.height})`);

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
                } catch {
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

            // Store device type in filename: homepage-desktop.png, homepage-mobile.png, etc.
            const deviceSuffix = deviceType ? `-${deviceType}` : '';
            const filePath = `${siteId}/${pagePath === '/' ? 'homepage' : pagePath.replace(/^\//, '')}${deviceSuffix}.png`;
            console.log(`Uploading screenshot to Supabase at: ${filePath}`);

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