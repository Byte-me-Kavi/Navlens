import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkClickHouseHealth, getClickHouseClient } from "@/lib/clickhouse";

import { withMonitoring } from "@/lib/api-middleware";

export const dynamic = 'force-dynamic';

async function GET_handler() {
    const start = performance.now();

    // 1. Check Supabase (Status + Basic Usage Proxy)
    let supabaseStatus = 'unknown';
    let supabaseLatency = 0;
    const supabaseUsage = { size_bytes: 0, row_estimate: 0 };

    try {
        const sbStart = performance.now();
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        // Simple health check
        const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

        // Note: Unable to get exact DB size without admin SQL access, using row counts as proxy where possible
        // or if the user has a stored procedure. For now, we'll return count.

        supabaseLatency = Math.round(performance.now() - sbStart);
        supabaseStatus = error ? 'unhealthy' : 'healthy';

        if (count !== null) supabaseUsage.row_estimate = count;

    } catch (e) {
        supabaseStatus = 'unhealthy';
    }

    // 2. Check ClickHouse (Status + Storage Stats)
    const chHealth = await checkClickHouseHealth();
    const chUsage = { size_bytes: 0, rows: 0, monthly_requests: 0 };

    if (chHealth.healthy) {
        try {
            const client = getClickHouseClient();
            // Get storage and row count
            const statsQuery = `
            SELECT 
                sum(bytes) as size_bytes,
                sum(rows) as total_rows
            FROM system.parts 
            WHERE active = 1
        `;
            const statsRes = await client.query({ query: statsQuery, format: 'JSONEachRow' });
            const stats = await statsRes.json() as { size_bytes: string, total_rows: string }[];

            // Get Monthly Requests (Billing Proxy)
            const monthlyQuery = `
            SELECT count() as count 
            FROM api_metrics 
            WHERE timestamp >= toStartOfMonth(now())
        `;
            const monthlyRes = await client.query({ query: monthlyQuery, format: 'JSONEachRow' });
            const monthly = await monthlyRes.json() as { count: string }[];

            if (stats.length > 0) {
                chUsage.size_bytes = parseInt(stats[0].size_bytes);
                chUsage.rows = parseInt(stats[0].total_rows);
            }
            if (monthly.length > 0) {
                chUsage.monthly_requests = parseInt(monthly[0].count);
            }

        } catch (e) {
            console.error('Failed to fetch CH stats:', e);
        }
    }

    return NextResponse.json({
        status: (supabaseStatus === 'healthy' && chHealth.healthy) ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
            supabase: {
                status: supabaseStatus,
                latency_ms: supabaseLatency,
                usage: supabaseUsage
            },
            clickhouse: {
                status: chHealth.healthy ? 'healthy' : 'unhealthy',
                latency_ms: chHealth.latencyMs,
                error: chHealth.error,
                usage: chUsage
            }
        },
        total_latency_ms: Math.round(performance.now() - start)
    });
}

export const GET = withMonitoring(GET_handler);
