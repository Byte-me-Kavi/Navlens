import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';

// --- Type Definitions ---
interface CountResult {
  count: number;
}

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

// GET: Fetch all unique page paths for a site
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const siteId = searchParams.get('siteId');

        if (!siteId) {
            return NextResponse.json(
                { message: 'Missing required parameter: siteId' },
                { status: 400 }
            );
        }

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
    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[manage-page-paths] GET Error:', error);
        return NextResponse.json(
            { message: 'Failed to fetch page paths', error: errorMessage },
            { status: 500 }
        );
    }
}

// POST: Add a new page path (creates an event marker in ClickHouse)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { siteId, pagePath } = body;

        if (!siteId || !pagePath) {
            return NextResponse.json(
                { message: 'Missing required parameters: siteId, pagePath' },
                { status: 400 }
            );
        }

        // Validate path format
        if (!pagePath.startsWith('/')) {
            return NextResponse.json(
                { message: 'Page path must start with /' },
                { status: 400 }
            );
        }

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
    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[manage-page-paths] POST Error:', error);
        return NextResponse.json(
            { message: 'Failed to add page path', error: errorMessage },
            { status: 500 }
        );
    }
}

// DELETE: Remove a page path by deleting all events for that path
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { siteId, pagePath } = body;

        if (!siteId || !pagePath) {
            return NextResponse.json(
                { message: 'Missing required parameters: siteId, pagePath' },
                { status: 400 }
            );
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
    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[manage-page-paths] DELETE Error:', error);
        return NextResponse.json(
            { message: 'Failed to delete page path', error: errorMessage },
            { status: 500 }
        );
    }
}
