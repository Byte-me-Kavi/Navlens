import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Admin Client (Service Role is required to bypass RLS for uploads)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Optional: Config to allow large snapshot payloads (Next.js specific)
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Snapshots can be large
        },
    },
};

export async function POST(req: NextRequest) {
    const start = performance.now();
    try {
        console.log('DOM snapshot POST received');
        
        // 1. Extract Data (Including new width/height/hash fields from tracker)
        const body = await req.json();
        const { 
            site_id, 
            page_path, 
            device_type, 
            snapshot, 
            styles, 
            origin,
            width,     // Capture dimensions
            height,
            hash       // Capture content hash
        } = body;

        if (!site_id || !snapshot) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        // 2. Normalize Path for Filename (Safe for Storage)
        // URL: /blog/post-1  ->  File: blog_post-1
        const normalizedPath = page_path === '/' 
            ? 'homepage' 
            : page_path.replace(/^\//, '').replace(/\//g, '_');
            
        const fileName = `${normalizedPath}.json`;
        const storagePath = `${site_id}/${device_type}/${fileName}`;

        console.log('Processing snapshot:', storagePath);

        // 3. Prepare File Content
        // We wrap the raw rrweb snapshot with metadata for the renderer
        const fileContent = {
            snapshot,
            styles: styles || [], 
            origin: origin || '', 
            meta: { width, height, device_type } // Useful context for debugging
        };

        // 4. PARALLEL EXECUTION (The Optimization)
        // We run Storage Upload and DB Insert at the same time.
        await Promise.all([
            // Task A: Upload to Storage Bucket
            supabase.storage
                .from('snapshots')
                .upload(storagePath, JSON.stringify(fileContent), {
                    contentType: 'application/json',
                    upsert: true
                }).then(({ error }) => {
                    if (error) throw new Error(`Storage Error: ${error.message}`);
                }),

            // Task B: Update Database Index (Critical for Dashboard)
            supabase.from('snapshots').upsert({
                site_id: site_id,
                page_path: page_path,     // Store real path: "/pricing"
                device_type: device_type, // "mobile"
                storage_path: storagePath,
                resolution_width: width || (device_type === 'mobile' ? 375 : 1440),
                resolution_height: height || (device_type === 'mobile' ? 667 : 900),
                content_hash: hash || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'site_id, page_path, device_type'
            }).then(({ error }) => {
                if (error) throw new Error(`DB Error: ${error.message}`);
            })
        ]);

        console.log(`Snapshot processed in ${(performance.now() - start).toFixed(2)}ms`);
        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Snapshot upload failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}