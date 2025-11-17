import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';

// Initialize ClickHouse client
const clickhouseClient = (() => {
    const url = process.env.CLICKHOUSE_URL;
    
    if (url) {
        // Production: Use full URL for ClickHouse Cloud
        return createClient({ url });
    } else {
        // Development: Use host-based configuration for local ClickHouse
        return createClient({
            host: process.env.CLICKHOUSE_HOST || 'localhost',
            username: process.env.CLICKHOUSE_USER,
            password: process.env.CLICKHOUSE_PASSWORD,
            database: process.env.CLICKHOUSE_DATABASE,
        });
    }
})();

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

        // This query finds the most visited pages (e.g., top 50)
        // We filter by 'page_view' for efficiency and order by count.
        const query = `
            SELECT
                page_path,
                COUNT() AS views
            FROM
                events
            WHERE
                site_id = {siteId:String}
                AND event_type = 'page_view'
            GROUP BY
                page_path
            ORDER BY
                views DESC
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