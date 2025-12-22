import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';

interface SiteStatus {
    siteId: string;
    hasRecentEvents: boolean;
    lastEventTime: string | null;
    eventCountLast24h: number;
}

export async function POST(request: NextRequest) {
    try {
        const { siteIds } = await request.json();

        if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
            return NextResponse.json({ error: 'siteIds array is required' }, { status: 400 });
        }

        const client = getClickHouseClient();

        // Query ClickHouse to check for recent events (last 1 hours)
        const result = await client.query({
            query: `
        SELECT 
          site_id,
          max(timestamp) as last_event_time,
          count() as event_count_24h
        FROM events
        WHERE site_id IN ({siteIds:Array(String)})
          AND timestamp >= now() - INTERVAL 24 HOUR
        GROUP BY site_id
      `,
            query_params: { siteIds },
            format: 'JSONEachRow'
        });

        const rows = await result.json() as Array<{ site_id: string; last_event_time: string; event_count_24h: string }>;
        const eventsBysite = new Map<string, { lastEventTime: string; eventCount: number }>();

        for (const row of rows) {
            eventsBysite.set(row.site_id, {
                lastEventTime: row.last_event_time,
                eventCount: parseInt(row.event_count_24h, 10)
            });
        }

        // Build response for all requested sites
        const statuses: SiteStatus[] = siteIds.map((siteId: string) => {
            const siteData = eventsBysite.get(siteId);
            return {
                siteId,
                hasRecentEvents: !!siteData && siteData.eventCount > 0,
                lastEventTime: siteData?.lastEventTime || null,
                eventCountLast24h: siteData?.eventCount || 0
            };
        });

        return NextResponse.json({ statuses });

    } catch (error: any) {
        console.error('[SiteStatus] Error:', error);
        return NextResponse.json({ error: 'Failed to check site status' }, { status: 500 });
    }
}
