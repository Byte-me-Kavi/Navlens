import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateAndAuthorize(req);
    if (!authResult.isAuthorized) {
      return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
    }

    const body = await req.json();
    const { siteId, pagePath, deviceType } = body;

    // Validate inputs
    if (!siteId || !pagePath || !deviceType) {
      return NextResponse.json(
        { error: 'Missing required parameters: siteId, pagePath, deviceType' },
        { status: 400 }
      );
    }

    // Check if user is authorized for this site
    const authorized = isAuthorizedForSite(authResult.userSites, siteId);
    if (!authorized) {
      return createUnauthorizedResponse();
    }

    // Check if screenshots bucket exists, create if not
    const { data: buckets } = await supabase.storage.listBuckets();
    const screenshotsBucket = buckets?.find(b => b.name === 'screenshots');
    const snapshotsBucket = buckets?.find(b => b.name === 'snapshots');

    if (!screenshotsBucket) {
        console.log('[Smart Map] Creating screenshots bucket...');
        const { error: createError } = await supabase.storage.createBucket('screenshots', {
            public: false, // Private bucket
            allowedMimeTypes: ['application/json', 'image/png'],
            fileSizeLimit: 10485760 // 10MB
        });
        if (createError) {
            console.error('[Smart Map] Failed to create screenshots bucket:', createError);
            return NextResponse.json({ error: 'Failed to create storage bucket' }, { status: 500 });
        }
    }

    if (!snapshotsBucket) {
        console.log('[Smart Map] Creating snapshots bucket...');
        const { error: createError } = await supabase.storage.createBucket('snapshots', {
            public: false, // Private bucket
            allowedMimeTypes: ['application/json'],
            fileSizeLimit: 10485760 // 10MB
        });
        if (createError) {
            console.error('[Smart Map] Failed to create snapshots bucket:', createError);
            return NextResponse.json({ error: 'Failed to create snapshots bucket' }, { status: 500 });
        }
    }

    // Build the filename from pagePath and deviceType
    // Normalize path: "/" -> "homepage", "/about" -> "about"
    const normalizedPath = pagePath === '/' ? 'homepage' : pagePath.replace(/^\//, '').replace(/\//g, '-');
    const filename = `${normalizedPath}-${deviceType}.json`;

    // Fetch from Supabase with signed URL (server-side, not exposed to client)
    const { data, error } = await supabase.storage
      .from('screenshots')
      .download(`${siteId}/${filename}`);

    if (error || !data) {
      console.log(`[Smart Map] File not found: ${siteId}/${filename}`);
      return NextResponse.json([], { status: 200 }); // Return empty array if not found
    }

    // Parse and return the JSON
    const text = await data.text();
    const elements = JSON.parse(text);

    return NextResponse.json(elements, { status: 200 });
  } catch (error) {
    console.error('[Smart Map API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch smart map data' },
      { status: 500 }
    );
  }
}
