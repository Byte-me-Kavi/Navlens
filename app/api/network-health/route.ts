import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from '@/lib/clickhouse';
import { authenticateAndAuthorize, isAuthorizedForSite, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { apiCache, generateCacheKey, withCache } from '@/lib/cache';

export interface NetworkHealthData {
    overview: {
        totalRequests: number;
        successfulRequests: number;
        clientErrors: number;      // 4xx
        serverErrors: number;      // 5xx
        errorRate: number;         // percentage
        avgLatency: number;        // ms
        p50Latency: number;
        p95Latency: number;
        p99Latency: number;
        healthScore: 'healthy' | 'degraded' | 'critical';
    };
    trends: Array<{
        time_bucket: string;
        total_requests: number;
        error_count: number;
        error_rate: number;
        avg_latency: number;
    }>;
    topFailingEndpoints: Array<{
        url: string;
        method: string;
        total_requests: number;
        error_count: number;
        error_rate: number;
        avg_latency: number;
        last_seen: string;
    }>;
    pageAlerts: Array<{
        page_path: string;
        total_requests: number;
        error_count: number;
        error_rate: number;
        severity: 'warning' | 'critical';
    }>;
    recentErrors: Array<{
        timestamp: string;
        url: string;
        method: string;
        status: number;
        duration_ms: number;
        page_path: string;
    }>;
    statusCodeDistribution: Array<{
        status_code: number;
        count: number;
        category: 'success' | 'redirect' | 'client_error' | 'server_error';
    }>;
}

function calculateHealthScore(errorRate: number): 'healthy' | 'degraded' | 'critical' {
    if (errorRate <= 1) return 'healthy';
    if (errorRate <= 5) return 'degraded';
    return 'critical';
}

function categorizeStatusCode(status: number): 'success' | 'redirect' | 'client_error' | 'server_error' {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 300 && status < 400) return 'redirect';
    if (status >= 400 && status < 500) return 'client_error';
    return 'server_error';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { siteId, startDate, endDate, pagePath } = body;

        if (!siteId) {
            return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        // Authenticate
        const authResult = await authenticateAndAuthorize(request);
        if (!authResult.isAuthorized) {
            return createUnauthenticatedResponse();
        }
        if (!isAuthorizedForSite(authResult.userSites, siteId)) {
            return createUnauthorizedResponse();
        }

        const cacheKey = generateCacheKey(siteId, 'network-health', {
            startDate,
            endDate,
            pagePath,
        });

        const data = await withCache(
            apiCache,
            cacheKey,
            async () => {
                const clickhouse = getClickHouseClient();

                // Build date filter - use 7 days by default for network health
                let dateFilter = 'timestamp > now() - INTERVAL 7 DAY';
                if (startDate && endDate) {
                    const formatDate = (d: string) => d.replace('T', ' ').replace('Z', '').split('.')[0];
                    dateFilter = `timestamp BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'`;
                }

                const pageFilter = pagePath ? `AND page_path = {pagePath:String}` : '';

                // Overview query - comprehensive stats
                const overviewQuery = `
                    SELECT 
                        count(*) as total_requests,
                        countIf(network_status >= 200 AND network_status < 400) as successful_requests,
                        countIf(network_status >= 400 AND network_status < 500) as client_errors,
                        countIf(network_status >= 500) as server_errors,
                        round(countIf(network_status >= 400) * 100.0 / nullIf(count(*), 0), 2) as error_rate,
                        round(avg(network_duration_ms), 2) as avg_latency,
                        round(quantile(0.5)(network_duration_ms), 2) as p50_latency,
                        round(quantile(0.95)(network_duration_ms), 2) as p95_latency,
                        round(quantile(0.99)(network_duration_ms), 2) as p99_latency
                    FROM debug_events
                    WHERE 
                        site_id = {siteId:String}
                        AND event_type = 'network'
                        AND network_status > 0
                        AND ${dateFilter}
                        ${pageFilter}
                `;

                // Trends query - hourly breakdown
                const trendsQuery = `
                    SELECT 
                        formatDateTime(timestamp, '%Y-%m-%d %H:00') as time_bucket,
                        count(*) as total_requests,
                        countIf(network_status >= 400) as error_count,
                        round(countIf(network_status >= 400) * 100.0 / nullIf(count(*), 0), 2) as error_rate,
                        round(avg(network_duration_ms), 2) as avg_latency
                    FROM debug_events
                    WHERE 
                        site_id = {siteId:String}
                        AND event_type = 'network'
                        AND network_status > 0
                        AND ${dateFilter}
                        ${pageFilter}
                    GROUP BY time_bucket
                    ORDER BY time_bucket
                    LIMIT 168
                `;

                // Top failing endpoints - URLs with highest error rates
                const failingEndpointsQuery = `
                    SELECT 
                        network_url as url,
                        network_method as method,
                        count(*) as total_requests,
                        countIf(network_status >= 400) as error_count,
                        round(countIf(network_status >= 400) * 100.0 / nullIf(count(*), 0), 2) as error_rate,
                        round(avg(network_duration_ms), 2) as avg_latency,
                        max(timestamp) as last_seen
                    FROM debug_events
                    WHERE 
                        site_id = {siteId:String}
                        AND event_type = 'network'
                        AND network_status >= 400
                        AND ${dateFilter}
                        ${pageFilter}
                    GROUP BY url, method
                    HAVING error_count > 0
                    ORDER BY error_count DESC
                    LIMIT 20
                `;

                // Page alerts - pages with high error rates
                const pageAlertsQuery = `
                    SELECT 
                        page_path,
                        count(*) as total_requests,
                        countIf(network_status >= 400) as error_count,
                        round(countIf(network_status >= 400) * 100.0 / nullIf(count(*), 0), 2) as error_rate
                    FROM debug_events
                    WHERE 
                        site_id = {siteId:String}
                        AND event_type = 'network'
                        AND network_status > 0
                        AND ${dateFilter}
                    GROUP BY page_path
                    HAVING error_rate > 2
                    ORDER BY error_rate DESC
                    LIMIT 10
                `;

                // Recent errors - last 50 errors
                const recentErrorsQuery = `
                    SELECT 
                        timestamp,
                        network_url as url,
                        network_method as method,
                        network_status as status,
                        network_duration_ms as duration_ms,
                        page_path
                    FROM debug_events
                    WHERE 
                        site_id = {siteId:String}
                        AND event_type = 'network'
                        AND network_status >= 400
                        AND ${dateFilter}
                        ${pageFilter}
                    ORDER BY timestamp DESC
                    LIMIT 50
                `;

                // Status code distribution
                const statusDistributionQuery = `
                    SELECT 
                        network_status as status_code,
                        count(*) as count
                    FROM debug_events
                    WHERE 
                        site_id = {siteId:String}
                        AND event_type = 'network'
                        AND network_status > 0
                        AND ${dateFilter}
                        ${pageFilter}
                    GROUP BY status_code
                    ORDER BY count DESC
                    LIMIT 20
                `;

                try {
                    const [overviewResult, trendsResult, failingResult, alertsResult, errorsResult, statusResult] = await Promise.all([
                        clickhouse.query({ query: overviewQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                        clickhouse.query({ query: trendsQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                        clickhouse.query({ query: failingEndpointsQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                        clickhouse.query({ query: pageAlertsQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                        clickhouse.query({ query: recentErrorsQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                        clickhouse.query({ query: statusDistributionQuery, query_params: { siteId, pagePath: pagePath || '' }, format: 'JSONEachRow' }),
                    ]);

                    const [overview, trends, failing, alerts, errors, statusDist] = await Promise.all([
                        overviewResult.json(),
                        trendsResult.json(),
                        failingResult.json(),
                        alertsResult.json(),
                        errorsResult.json(),
                        statusResult.json(),
                    ]);

                    return { overview, trends, failing, alerts, errors, statusDist };
                } catch (queryError) {
                    console.error('[network-health] Query error:', queryError);
                    return { overview: [], trends: [], failing: [], alerts: [], errors: [], statusDist: [] };
                }
            },
            60000 // 1 minute cache
        );

        // Parse overview
        const overviewRow = (data.overview as Array<Record<string, string>>)[0] || {};
        const errorRate = parseFloat(overviewRow.error_rate) || 0;

        const overview = {
            totalRequests: parseInt(overviewRow.total_requests) || 0,
            successfulRequests: parseInt(overviewRow.successful_requests) || 0,
            clientErrors: parseInt(overviewRow.client_errors) || 0,
            serverErrors: parseInt(overviewRow.server_errors) || 0,
            errorRate,
            avgLatency: parseFloat(overviewRow.avg_latency) || 0,
            p50Latency: parseFloat(overviewRow.p50_latency) || 0,
            p95Latency: parseFloat(overviewRow.p95_latency) || 0,
            p99Latency: parseFloat(overviewRow.p99_latency) || 0,
            healthScore: calculateHealthScore(errorRate),
        };

        // Parse trends
        const trends = (data.trends as Array<Record<string, string>>).map(row => ({
            time_bucket: row.time_bucket,
            total_requests: parseInt(row.total_requests) || 0,
            error_count: parseInt(row.error_count) || 0,
            error_rate: parseFloat(row.error_rate) || 0,
            avg_latency: parseFloat(row.avg_latency) || 0,
        }));

        // Parse failing endpoints
        const topFailingEndpoints = (data.failing as Array<Record<string, string>>).map(row => ({
            url: row.url || '',
            method: row.method || 'GET',
            total_requests: parseInt(row.total_requests) || 0,
            error_count: parseInt(row.error_count) || 0,
            error_rate: parseFloat(row.error_rate) || 0,
            avg_latency: parseFloat(row.avg_latency) || 0,
            last_seen: row.last_seen || '',
        }));

        // Parse page alerts
        const pageAlerts = (data.alerts as Array<Record<string, string>>).map(row => {
            const rate = parseFloat(row.error_rate) || 0;
            return {
                page_path: row.page_path || '',
                total_requests: parseInt(row.total_requests) || 0,
                error_count: parseInt(row.error_count) || 0,
                error_rate: rate,
                severity: rate > 10 ? 'critical' : 'warning' as 'critical' | 'warning',
            };
        });

        // Parse recent errors
        const recentErrors = (data.errors as Array<Record<string, string | number>>).map(row => ({
            timestamp: String(row.timestamp || ''),
            url: String(row.url || ''),
            method: String(row.method || 'GET'),
            status: Number(row.status) || 0,
            duration_ms: Number(row.duration_ms) || 0,
            page_path: String(row.page_path || ''),
        }));

        // Parse status distribution
        const statusCodeDistribution = (data.statusDist as Array<Record<string, number>>).map(row => ({
            status_code: Number(row.status_code) || 0,
            count: Number(row.count) || 0,
            category: categorizeStatusCode(Number(row.status_code)),
        }));

        const response: NetworkHealthData = {
            overview,
            trends,
            topFailingEndpoints,
            pageAlerts,
            recentErrors,
            statusCodeDistribution,
        };

        return NextResponse.json(response);
    } catch (error: unknown) {
        console.error('[network-health] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
