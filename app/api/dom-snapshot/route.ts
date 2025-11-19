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
        const { site_id, page_path, device_type, snapshot } = await req.json();

        if (!site_id || !snapshot) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        // Normalize path
        const normalizedPath = page_path === '/' ? 'homepage' : page_path.replace(/^\//, '').replace(/\//g, '_');
        
        // File path: site_id/desktop/homepage.json
        const filePath = `${site_id}/${device_type}/${normalizedPath}.json`;

        // Upload JSON to Supabase Storage (snapshots bucket)
        // Note: We assume the bucket 'snapshots' is already created as private in your Supabase dashboard.
        // If not, create it manually or uncomment the bucket creation logic (which is slower).
        
        const { error } = await supabase.storage
            .from('snapshots')
            .upload(filePath, JSON.stringify(snapshot), {
                contentType: 'application/json',
                upsert: true
            });

        if (error) {
             console.error('Snapshot upload failed:', error);
             throw error;
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Snapshot upload failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}