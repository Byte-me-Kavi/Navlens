import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { getClickHouseClient } from '@/lib/clickhouse';

// --- Type Definitions ---
interface CountResult {
    count: number;
}

// Get the singleton ClickHouse client
const clickhouseClient = getClickHouseClient();

// POST: Fetch page paths for a site OR add a new page path
export async function POST(req: NextRequest) {
    try {
        // Authenticate user and get their authorized sites
        const authResult = await authenticateAndAuthorize(req);

        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await req.json();
        const { siteId, pagePath } = body;

        // Validate siteId parameter
        if (!siteId || typeof siteId !== 'string') {
            return NextResponse.json(
                { message: 'Missing or invalid siteId parameter' },
                { status: 400 }
            );
        }

        // Validate siteId format (UUID)
        if (!validators.isValidUUID(siteId)) {
            return NextResponse.json(
                { message: 'Invalid siteId format' },
                { status: 400 }
            );
        }

        // Check if user is authorized for this site
        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        // If pagePath is provided, this is an ADD operation
        if (pagePath) {
            // Validate path format
            if (!pagePath.startsWith('/')) {
                return NextResponse.json(
                    { message: 'Page path must start with /' },
                    { status: 400 }
                );
            }

            // --- LIMIT ENFORCEMENT START ---
            // Get user's subscription limits for heatmap pages
            // Reuse existing authResult instead of calling authenticateAndAuthorize again
            if (authResult.user) {
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                // Get the site's user_id
                const { data: siteData } = await supabaseAdmin
                    .from('sites')
                    .select('user_id')
                    .eq('id', siteId)
                    .single();

                if (siteData?.user_id) {

                    const { data: profile } = await supabaseAdmin
                        .from('profiles')
                        .select(`
                        subscriptions (
                            status,
                            subscription_plans (
                                name,
                                limits
                            )
                        )
                    `)
                        .eq('user_id', siteData.user_id)
                        .single();

                    // Default limit (Free plan) -> 3 heatmap pages
                    let maxHeatmapPages = 3;

                    if (profile?.subscriptions) {
                        const sub = Array.isArray(profile.subscriptions) ? profile.subscriptions[0] : profile.subscriptions;
                        if (sub?.status === 'active' && sub?.subscription_plans) {
                            const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans;
                            const limits = plan.limits as any;

                            if (limits?.heatmap_pages !== undefined) {
                                maxHeatmapPages = limits.heatmap_pages;
                            } else {
                                // Fallback logic based on plan name
                                const planName = plan.name?.toLowerCase() || '';
                                if (planName.includes('starter')) maxHeatmapPages = 8;
                                else if (planName.includes('pro')) maxHeatmapPages = 15;
                                else if (planName.includes('enterprise')) maxHeatmapPages = -1; // Unlimited
                            }
                        }
                    }

                    // Count existing distinct page paths for this site
                    if (maxHeatmapPages !== -1) {
                        const countQuery = `
                        SELECT COUNT(DISTINCT page_path) as count
                        FROM events
                        WHERE site_id = {siteId:String}
                          AND page_path IS NOT NULL
                          AND page_path != ''
                    `;

                        const countResult = await clickhouseClient.query({
                            query: countQuery,
                            query_params: { siteId },
                            format: 'JSON',
                        });

                        const countData = await countResult.json();
                        const currentPageCount = (countData.data?.[0] as CountResult)?.count || 0;

                        if (currentPageCount >= maxHeatmapPages) {
                            return NextResponse.json(
                                {
                                    message: `Plan limit reached. You can have ${maxHeatmapPages} heatmap page${maxHeatmapPages === 1 ? '' : 's'}. Delete an existing page or upgrade your plan.`,
                                    limit: maxHeatmapPages,
                                    current: currentPageCount
                                },
                                { status: 403 }
                            );
                        }
                    }
                }
            }
            // --- LIMIT ENFORCEMENT END ---

            // Check if path already exists
            const checkQuery = `
                SELECT COUNT() as count
                FROM events
                WHERE
                    site_id = {siteId:String}
                    AND page_path = {pagePath:String}
                LIMIT 1
            `;

            const checkResult = await clickhouseClient.query({
                query: checkQuery,
                query_params: { siteId, pagePath },
                format: 'JSON',
            });

            const checkData = await checkResult.json();
            const pathExists = ((checkData.data?.[0] as CountResult)?.count || 0) > 0;

            if (!pathExists) {
                // Insert a marker event to add this path to the database
                // This ensures the path will show up in future queries
                const insertQuery = `
                    INSERT INTO events (
                        site_id,
                        page_path,
                        event_type,
                        timestamp,
                        device_type,
                        x_relative,
                        y_relative,
                        scroll_depth
                    ) VALUES (
                        {siteId:String},
                        {pagePath:String},
                        'path_marker',
                        now(),
                        'unknown',
                        0,
                        0,
                        0
                    )
                `;

                await clickhouseClient.query({
                    query: insertQuery,
                    query_params: { siteId, pagePath },
                });
            }

            return NextResponse.json(
                { message: 'Page path added successfully', pagePath },
                { status: 200 }
            );
        }

        // If no pagePath provided, this is a FETCH operation
        // Get all unique page paths from events
        const query = `
            SELECT DISTINCT
                page_path
            FROM events
            WHERE
                site_id = {siteId:String}
                AND page_path IS NOT NULL
                AND page_path != ''
            ORDER BY page_path ASC
        `;

        const resultSet = await clickhouseClient.query({
            query: query,
            query_params: { siteId },
            format: 'JSON',
        });

        const queryData = await resultSet.json();
        const pagePaths = ((queryData.data || []) as Array<{ page_path: string }>).map(
            (row) => row.page_path
        );

        return NextResponse.json({ pagePaths }, { status: 200 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[manage-page-paths] POST Error:', error);
        return NextResponse.json(
            { message: 'Failed to process page paths request', error: errorMessage },
            { status: 500 }
        );
    }
}

// DELETE: Remove a page path by deleting all events for that path
export async function DELETE(req: NextRequest) {
    try {
        // Authenticate user and get their authorized sites
        const authResult = await authenticateAndAuthorize(req);

        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await req.json();
        const { siteId, pagePath } = body;

        if (!siteId || !pagePath) {
            return NextResponse.json(
                { message: 'Missing required parameters: siteId, pagePath' },
                { status: 400 }
            );
        }

        // Validate siteId format (UUID)
        if (!validators.isValidUUID(siteId)) {
            return NextResponse.json(
                { message: 'Invalid siteId format' },
                { status: 400 }
            );
        }

        // Check if user is authorized for this site
        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        // Delete all events for this specific page path
        const deleteQuery = `
            ALTER TABLE events DELETE
            WHERE
                site_id = {siteId:String}
                AND page_path = {pagePath:String}
        `;

        await clickhouseClient.query({
            query: deleteQuery,
            query_params: { siteId, pagePath },
        });

        return NextResponse.json(
            { message: 'Page path deleted successfully', pagePath },
            { status: 200 }
        );
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[manage-page-paths] DELETE Error:', error);
        return NextResponse.json(
            { message: 'Failed to delete page path', error: errorMessage },
            { status: 500 }
        );
    }
}
