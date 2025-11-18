import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';
import { validators } from '@/lib/validation';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';

// Initialize ClickHouse client
const clickhouseClient = (() => {
    const url = process.env.CLICKHOUSE_URL;
    
    if (url) {
        // Production: Use full URL for ClickHouse Cloud
        return createClient({ url });
    } else {
        // Development: Use host-based configuration for local ClickHouse
        return createClient({
            url: `http://${process.env.CLICKHOUSE_HOST || 'localhost'}:8123`,
            username: process.env.CLICKHOUSE_USER,
            password: process.env.CLICKHOUSE_PASSWORD,
            database: process.env.CLICKHOUSE_DATABASE,
        });
    }
})();

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

        // Get all unique page paths that have any events (not just page_view)
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
            query_params: {
                siteId: siteId,
            },
            format: 'JSON',
        });

        const queryData = await resultSet.json();
        console.log('[get-pages-list] Raw ClickHouse result:', JSON.stringify(queryData));
        
        // Extract just the page_path strings
        const pagePaths = ((queryData.data || []) as Array<{ page_path: string }>).map(
            (row) => row.page_path
        );
        console.log('[get-pages-list] Extracted page paths:', pagePaths);

        return NextResponse.json({ pagePaths: pagePaths }, { status: 200 });

    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching page paths:', error);
        return NextResponse.json(
            { message: 'Failed to fetch page paths', error: errorMessage },
            { status: 500 }
        );
    }
}