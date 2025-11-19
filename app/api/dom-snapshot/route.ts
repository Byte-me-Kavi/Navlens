import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { site_id, page_path, device_type, snapshot } = await req.json();

        if (!site_id || !snapshot) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        // Normalize path
        const normalizedPath = page_path === '/' ? 'homepage' : page_path.replace(/^\//, '');
        
        // File path: site_id/desktop/homepage.json
        const filePath = `${site_id}/${device_type}/${normalizedPath}.json`;

        // Ensure the snapshots bucket exists
        const { data: buckets } = await supabase.storage.listBuckets();
        const snapshotsBucket = buckets?.find(b => b.name === 'snapshots');

        if (!snapshotsBucket) {
            console.log('[DOM Snapshot] Creating snapshots bucket...');
            const { error: createError } = await supabase.storage.createBucket('snapshots', {
                public: false, // Private bucket
                allowedMimeTypes: ['application/json'],
                fileSizeLimit: 10485760 // 10MB
            });
            if (createError) {
                console.error('[DOM Snapshot] Failed to create bucket:', createError);
                return NextResponse.json({ error: 'Failed to create storage bucket' }, { status: 500 });
            }
        }

        // Upload JSON to Supabase Storage
        const { error } = await supabase.storage
            .from('snapshots')
            .upload(filePath, JSON.stringify(snapshot), {
                contentType: 'application/json',
                upsert: true
            });

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Snapshot upload failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}