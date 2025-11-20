import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export async function POST(req: NextRequest) {
    try {
        console.log('DOM snapshot POST received');
        const { site_id, page_path, device_type, snapshot, styles, origin } = await req.json();
        console.log('Parsed JSON, site_id:', site_id, 'page_path:', page_path, 'device_type:', device_type, 'origin:', origin);

        if (!site_id || !snapshot) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        // Normalize path
        const normalizedPath = page_path === '/' ? 'homepage' : page_path.replace(/^\//, '').replace(/\//g, '_');
        
        // File path: site_id/desktop/homepage.json
        const filePath = `${site_id}/${device_type}/${normalizedPath}.json`;
        console.log('File path:', filePath);

        // Upload JSON to Supabase Storage (snapshots bucket)
        // Note: We assume the bucket 'snapshots' is already created as private in your Supabase dashboard.
        // If not, create it manually or uncomment the bucket creation logic (which is slower).
        
        console.log('Uploading to Supabase...');
        
        // Combine snapshot, styles, and origin into a single object
        const snapshotWithMetadata = {
            snapshot,
            styles: styles || [], // Include extracted CSS
            origin: origin || '', // Include origin for base tag in iframe
        };
        
        const { error } = await supabase.storage
            .from('snapshots')
            .upload(filePath, JSON.stringify(snapshotWithMetadata), {
                contentType: 'application/json',
                upsert: true
            });

        if (error) {
             console.error('Snapshot upload failed:', error);
             throw error;
        }

        console.log('Upload successful');
        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Snapshot upload failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}