// app/api/seed-test-data/route.ts
import { createClient } from '@clickhouse/client';
import { NextResponse } from 'next/server';

const client = createClient({
    host: process.env.CLICKHOUSE_HOST || 'localhost',
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
    database: process.env.CLICKHOUSE_DATABASE,
});

export async function POST() {
    try {
        const SITE_ID = 'a2a95f61-1024-40f8-af7e-4c4df2fcbd01';
        const PAGE_PATHS = ['/', '/login', '/dashboard', '/settings'];

        // Generate mock click data for each page path
        const mockEvents = [];
        const now = new Date();

        PAGE_PATHS.forEach((PAGE_PATH) => {
            for (let i = 0; i < 50; i++) {
                // Random x and y relative positions (0-1 range)
                const x_relative = Math.random();
                const y_relative = Math.random();

                mockEvents.push({
                    site_id: SITE_ID,
                    event_type: 'click',
                    timestamp: new Date(now.getTime() - Math.random() * 3600000).toISOString().slice(0, 19).replace('T', ' '),
                    page_url: `https://navlens-rho.vercel.app${PAGE_PATH}`,
                    page_path: PAGE_PATH,
                    referrer: '',
                    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    user_language: 'en-US',
                    viewport_width: 1920,
                    viewport_height: 1080,
                    screen_width: 1920,
                    screen_height: 1080,
                    device_type: 'desktop',
                    session_id: `session-${PAGE_PATH}-${i}`,
                    client_id: `client-${PAGE_PATH}-${i}`,
                    x: Math.round(x_relative * 1920),
                    y: Math.round(y_relative * 1080),
                    x_relative: x_relative,
                    y_relative: y_relative,
                    element_id: `element-${i}`,
                    element_classes: 'test-class',
                    element_tag: 'button',
                    element_text: 'Test Element',
                    element_selector: 'body > .container',
                });
            }
        });

        console.log(`Inserting ${mockEvents.length} mock click events for ${PAGE_PATHS.length} pages...`);

        await client.insert({
            table: 'events',
            values: mockEvents,
            format: 'JSONEachRow',
        });

        return NextResponse.json(
            { message: `Successfully inserted ${mockEvents.length} mock click events for pages: ${PAGE_PATHS.join(', ')}` },
            { status: 200 }
        );
    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error seeding test data:', error);
        return NextResponse.json(
            { message: 'Failed to seed test data', error: errorMessage },
            { status: 500 }
        );
    }
}
