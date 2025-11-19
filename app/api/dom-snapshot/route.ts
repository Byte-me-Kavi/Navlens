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

        // Upload JSON to Supabase Storage
        const { error } = await supabase.storage
            .from('snapshots') // Create a NEW bucket called 'snapshots'
            .upload(filePath, JSON.stringify(snapshot), {
                contentType: 'application/json',
                upsert: true
            });

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Snapshot upload failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}