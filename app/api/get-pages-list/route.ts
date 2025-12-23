import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { unstable_cache } from 'next/cache';

import { getClickHouseClient } from '@/lib/clickhouse';

// Get the singleton ClickHouse client
const clickhouseClient = getClickHouseClient();

// Cached query function - revalidates every 2 minutes
// This dramatically speeds up repeated requests for the same site
const getCachedPagePaths = unstable_cache(
    async (siteId: string): Promise<string[]> => {
        const query = `
            SELECT DISTINCT
                page_path
            FROM events
            WHERE
                site_id = {siteId:String}
                AND page_path IS NOT NULL
                AND page_path != ''
            ORDER BY page_path ASC
            LIMIT 50
        `;

        const resultSet = await clickhouseClient.query({
            query: query,
            query_params: { siteId },
            format: 'JSON',
        });

        const queryData = await resultSet.json();
        return ((queryData.data || []) as Array<{ page_path: string }>).map(
            (row) => row.page_path
        );
    },
    ['pages-list'], // Cache key tag
    { revalidate: 120, tags: ['pages-list'] } // Cache for 2 minutes
);

export async function POST(req: NextRequest) {
    try {
        // Authenticate user and get their authorized sites
        const authResult = await authenticateAndAuthorize(req);

        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        // Parse siteId from request body instead of URL params
        const body = await req.json();
        const siteId = body.siteId;

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

        // Get cached page paths (fast!)
        const start = performance.now();
        const pagePaths = await getCachedPagePaths(siteId);
        const elapsed = Math.round(performance.now() - start);

        console.log(`[get-pages-list] Fetched ${pagePaths.length} paths in ${elapsed}ms`);

        return NextResponse.json(
            { pagePaths },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
                }
            }
        );

    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching page paths:', error);
        return NextResponse.json(
            { message: 'Failed to fetch page paths', error: errorMessage },
            { status: 500 }
        );
    }
}