import { NextRequest, NextResponse } from "next/server";
import { getClickHouseClient } from "@/lib/clickhouse";

import { withMonitoring } from "@/lib/api-middleware";

export const dynamic = 'force-dynamic';

async function GET_handler(req: NextRequest) {
  try {
    const client = getClickHouseClient();
    const { searchParams } = new URL(req.url);
    const pathFilter = searchParams.get('path');

    // Base WHERE clause
    let whereClause = "WHERE timestamp >= now() - INTERVAL 24 HOUR";
    const queryParams: Record<string, unknown> = {};

    if (pathFilter && pathFilter !== 'all') {
      whereClause += " AND path = {path:String}";
      queryParams.path = pathFilter;
    }

    // 1. Chart Data - Last 60 minutes (granular)
    const chartQuery = `
      SELECT 
        toUnixTimestamp(toStartOfMinute(timestamp)) as time_epoch,
        count() as total_requests,
        countIf(status_code >= 200 AND status_code < 300) as success_requests,
        countIf(status_code >= 400) as error_requests,
        avg(duration_ms) as avg_latency
      FROM api_metrics
      ${whereClause.replace('24 HOUR', '1 HOUR')}
      GROUP BY time_epoch
      ORDER BY time_epoch ASC
    `;

    const result = await client.query({
      query: chartQuery,
      query_params: queryParams,
      format: 'JSONEachRow',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawData = await result.json() as any[];

    // Zero-fill for the last 60 minutes
    const chart_data = [];
    const now = new Date();
    // Align to start of current minute (ms precision)
    now.setMilliseconds(0);
    now.setSeconds(0);
    const currentEpoch = now.getTime() / 1000; // seconds

    // Create a map for O(1) lookup
    const dataMap = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawData.forEach((d: any) => {
      // d.time_epoch is already seconds (integer)
      dataMap.set(parseInt(d.time_epoch), d);
    });

    for (let i = 59; i >= 0; i--) {
      const targetEpoch = currentEpoch - (i * 60);
      const match = dataMap.get(targetEpoch);

      // Reconstruct ISO string for frontend
      const timeIso = new Date(targetEpoch * 1000).toISOString();

      if (match) {
        chart_data.push({
          time: timeIso,
          total_requests: parseInt(match.total_requests),
          error_requests: parseInt(match.error_requests),
          avg_latency: parseFloat(match.avg_latency)
        });
      } else {
        chart_data.push({
          time: timeIso,
          total_requests: 0,
          error_requests: 0,
          avg_latency: 0
        });
      }
    }

    // 2. Summary stats
    const summaryQuery = `
      SELECT
        count() as total_reqs,
        avg(duration_ms) as avg_lat,
        countIf(status_code >= 400) / count() * 100 as error_rate
      FROM api_metrics
      ${whereClause}
    `;

    const summaryResult = await client.query({
      query: summaryQuery,
      query_params: queryParams,
      format: 'JSONEachRow',
    });

    const summary = await summaryResult.json();

    // 3. Get list of paths for dropdown (from last 24h)
    const pathsQuery = `
        SELECT DISTINCT path FROM api_metrics 
        WHERE timestamp >= now() - INTERVAL 24 HOUR 
        ORDER BY path ASC
    `;

    const pathsResult = await client.query({
      query: pathsQuery,
      format: 'JSONEachRow'
    });

    const paths = await pathsResult.json();

    return NextResponse.json({
      chart_data: chart_data,
      summary: summary[0] || { total_reqs: 0, avg_lat: 0, error_rate: 0 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      paths: (paths as any[]).map(p => p.path)
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}

export const GET = withMonitoring(GET_handler);
