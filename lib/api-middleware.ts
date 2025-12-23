
import { NextRequest, NextResponse } from 'next/server';
import { getClickHouseClient } from './clickhouse';

type ApiHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse>;

/**
 * Middleware to track API metrics in ClickHouse
 * Wraps an API route handler
 */
export function withMonitoring(handler: ApiHandler): ApiHandler {
    return async (req: NextRequest, context?: unknown) => {
        const start = performance.now();
        let response: NextResponse;
        let statusCode = 500;

        try {
            response = await handler(req, context);
            statusCode = response.status;
            return response;
        } catch (error) {
            statusCode = 500;
            throw error;
        } finally {
            // Async logging (await to ensure delivery for debugging)
            const durationMs = Math.round(performance.now() - start);
            const url = new URL(req.url);
            const path = url.pathname;
            const method = req.method;
            let ip = req.headers.get('x-forwarded-for') || 'unknown';

            // Fix for ClickHouse IPv4 column not accepting IPv6 localhost
            if (ip === '::1' || ip === '::ffff:127.0.0.1') {
                ip = '127.0.0.1';
            }

            const userAgent = req.headers.get('user-agent') || 'unknown';

            // Try to extract siteId from query params if available
            const siteId = url.searchParams.get('siteId') || '';

            await logMetric({
                path,
                method,
                status_code: statusCode,
                duration_ms: durationMs,
                ip,
                user_agent: userAgent,
                site_id: siteId
            });
        }
    };
}

async function logMetric(metric: {
    path: string;
    method: string;
    status_code: number;
    duration_ms: number;
    ip: string;
    user_agent: string;
    site_id: string;
}) {
    try {
        const client = getClickHouseClient();
        await client.insert({
            table: 'api_metrics',
            values: [metric],
            format: 'JSONEachRow',
        });
    } catch (error) {
        // Silent fail for metrics to not impact app stability
        console.error('[Monitoring] Error logging metric:', error);
    }
}
