import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    try {
        console.log('Get snapshot GET received');
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId');
        const pagePath = searchParams.get('pagePath');
        const deviceType = searchParams.get('deviceType');
        console.log('Params:', { siteId, pagePath, deviceType });

        if (!siteId || !pagePath || !deviceType) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Normalize path to match upload logic
        const normalizedPath = pagePath === '/' ? 'homepage' : pagePath.replace(/^\//, '').replace(/\//g, '_');
        const filePath = `${siteId}/${deviceType}/${normalizedPath}.json`;
        console.log('File path:', filePath);

        // Download the JSON file
        console.log('Downloading from Supabase...');
        const { data, error } = await supabase.storage
            .from('snapshots')
            .download(filePath);

        if (error) {
            console.error('Snapshot download error:', error);
            return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
        }

        // Parse the Blob/File into JSON
        const text = await data.text();
        console.log('Downloaded text length:', text.length);
        const json = JSON.parse(text);

        console.log('Returning snapshot');
        return NextResponse.json(json, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}