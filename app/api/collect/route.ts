import { createClient } from '@clickhouse/client';
import { NextRequest, NextResponse } from 'next/server';

// Initialize ClickHouse client once for performance
const client = createClient({
    host: process.env.CLICKHOUSE_HOST || 'localhost',
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
    database: process.env.CLICKHOUSE_DATABASE,
});

export async function POST(req: NextRequest) {
    try {
        const events = await req.json(); // Expects an array of events or a single event object
        
        // Ensure events is an array for batch insertion, even if a single object comes in
        const eventsArray = Array.isArray(events) ? events : [events];
        
        console.log(`[collect] Received ${eventsArray.length} event(s):`, JSON.stringify(eventsArray.slice(0, 2)));
        
        // Perform the insertion into the 'events' table
        await client.insert({
            table: 'events', // The name of your ClickHouse table
            values: eventsArray,
            format: 'JSONEachRow', // ClickHouse expects each row as a JSON object on a new line
            // Ensure your incoming JSON keys match your table column names
        });
        
        console.log(`[collect] Successfully inserted ${eventsArray.length} event(s)`);
        
        // Return a successful response
        return NextResponse.json({ message: 'Events ingested successfully' }, { status: 200 });
        
    } catch (error: Error | unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[collect] Error ingesting events to ClickHouse:', error);
        // Return an error response
        return NextResponse.json(
            { message: 'Failed to ingest events', error: errorMessage },
            { status: 500 }
        );
    }
}