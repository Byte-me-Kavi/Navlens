import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { nanoid } from 'nanoid';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Create a shareable report link
export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const authResult = await authenticateAndAuthorize(req);
        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await req.json();
        const { siteId, days = 30, include = 'all', expiresInDays } = body;

        if (!siteId) {
            return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
        }

        // Check if user is authorized for this site
        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        // Generate unique share token
        const shareToken = nanoid(16);

        // Calculate expiration (optional)
        const expiresAt = expiresInDays
            ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            : null;

        // Create share record
        const { data, error } = await supabase
            .from('report_shares')
            .insert({
                site_id: siteId,
                share_token: shareToken,
                days,
                include,
                created_by: authResult.user?.id === 'admin-bypass' ? null : authResult.user?.id,
                expires_at: expiresAt
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating share:', error);
            return NextResponse.json({ error: `Failed to create share link: ${error.message || JSON.stringify(error)}` }, { status: 500 });
        }

        // Get base URL from request
        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const host = req.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        return NextResponse.json({
            success: true,
            share: {
                token: shareToken,
                url: `${baseUrl}/report/${shareToken}`,
                expiresAt: expiresAt,
                createdAt: data.created_at
            }
        });

    } catch (error) {
        console.error('Share API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET: List shares for a site
export async function GET(req: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(req);
        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId');

        if (!siteId) {
            return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
        }

        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        const { data, error } = await supabase
            .from('report_shares')
            .select('*')
            .eq('site_id', siteId)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
        }

        return NextResponse.json({ shares: data || [] });

    } catch (error) {
        console.error('Share API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove a share
export async function DELETE(req: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(req);
        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await req.json();
        const { shareId, siteId } = body;

        if (!shareId || !siteId) {
            return NextResponse.json({ error: 'Share ID and Site ID are required' }, { status: 400 });
        }

        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        const { error } = await supabase
            .from('report_shares')
            .delete()
            .eq('id', shareId)
            .eq('site_id', siteId);

        if (error) {
            return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Share API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
