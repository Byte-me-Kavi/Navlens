import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createServerClient } from '@supabase/ssr';
import { getClickHouseClient } from '@/lib/clickhouse';
import { cookies } from 'next/headers';

// Define expected body format
interface ReportRequest {
    siteId: string;
    heatmapImages?: Record<string, string>; // path -> base64
}

// Helper Colors (as rgb values 0-1)
const colors = {
    indigo: rgb(0.388, 0.4, 0.945),      // #6366f1
    dark: rgb(0.122, 0.161, 0.216),       // #1f2937
    muted: rgb(0.42, 0.451, 0.502),       // #6b7280
    light: rgb(0.953, 0.957, 0.961),      // #f3f4f6
    border: rgb(0.898, 0.906, 0.922),     // #e5e7eb
    white: rgb(1, 1, 1),
    black: rgb(0, 0, 0),
};

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as ReportRequest;
        const { siteId, heatmapImages = {} } = body;

        if (!siteId) {
            return NextResponse.json({ error: 'Missing siteId' }, { status: 400 });
        }

        // 1. Auth & Validation
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
                            // safe to ignore
                        }
                    }
                }
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.log('[Report API] User unauthorized or not found', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check site access
        const { data: site } = await supabase.from('sites').select('id, domain').eq('id', siteId).eq('user_id', user.id).single();
        
        if (!site) {
            console.log('[Report API] Site not found for this user');
            return NextResponse.json({ error: 'Site not found or access denied' }, { status: 404 });
        }

        console.log('[Report API] Site found:', site.domain);

        // 2. Fetch Data (Server Side)
        const clickHouseClient = getClickHouseClient();

        const [statsResult, topPagesResult, deviceResult] = await Promise.allSettled([
            clickHouseClient.query({
                query: `
                SELECT 
                    sum(total_clicks) as total_clicks,
                    uniq(session_id) as unique_sessions
                FROM dashboard_stats_hourly
                WHERE site_id = {siteId:String}
                AND hour >= now() - INTERVAL 30 DAY
            `,
                query_params: { siteId: site.id },
                format: 'JSON'
            }).then((res) => res.json<any>()),

            clickHouseClient.query({
                query: `
                SELECT page_path, sum(visits) as count
                FROM top_pages_hourly
                WHERE site_id = {siteId:String}
                AND hour >= now() - INTERVAL 30 DAY
                GROUP BY page_path
                ORDER BY count DESC
                LIMIT 5
            `,
                query_params: { siteId: site.id },
                format: 'JSON'
            }).then((res) => res.json<any>()),

            clickHouseClient.query({
                query: `
                SELECT device_type, uniq(unique_sessions) as count
                FROM device_stats_daily
                WHERE site_id = {siteId:String}
                AND day >= now() - INTERVAL 30 DAY
                GROUP BY device_type
                ORDER BY count DESC
                LIMIT 10
            `,
                query_params: { siteId: site.id },
                format: 'JSON'
            }).then(res => res.json())
        ]);

        // Process Data
        const statsData = statsResult.status === 'fulfilled' ? statsResult.value.data[0] : {};
        const topPages = topPagesResult.status === 'fulfilled' 
            ? topPagesResult.value.data.map((r: any) => ({ path: r.page_path, visits: +r.count })) 
            : [];
        const deviceStats = deviceResult.status === 'fulfilled' 
            ? deviceResult.value.data.map((r: any) => ({ device: r.device_type, count: +r.count })) 
            : [];

        console.log('[Report API] Generating PDF with pdf-lib...');

        // 3. Create PDF Document
        const pdfDoc = await PDFDocument.create();
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const PAGE_WIDTH = 595.28;  // A4 Width in points
        const PAGE_HEIGHT = 841.89; // A4 Height in points
        const MARGIN = 50;

        // ============ PAGE 1: Overview ============
        let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        let y = PAGE_HEIGHT - MARGIN;

        // Header
        page.drawRectangle({
            x: 0, y: PAGE_HEIGHT - 80,
            width: PAGE_WIDTH, height: 80,
            color: colors.indigo,
        });

        page.drawText('Navlens Analytics Report', {
            x: MARGIN, y: PAGE_HEIGHT - 50,
            size: 24,
            font: helveticaBold,
            color: colors.white,
        });

        page.drawText(`${site.domain} • Last 30 Days`, {
            x: MARGIN, y: PAGE_HEIGHT - 70,
            size: 12,
            font: helvetica,
            color: rgb(0.9, 0.9, 0.95),
        });

        y = PAGE_HEIGHT - 120;

        // Stats Section
        page.drawText('Executive Summary', {
            x: MARGIN, y,
            size: 18,
            font: helveticaBold,
            color: colors.dark,
        });
        y -= 40;

        const totalClicks = +statsData.total_clicks || 0;
        const uniqueSessions = +statsData.unique_sessions || 0;

        // Stats Cards (side by side)
        const cardWidth = (PAGE_WIDTH - MARGIN * 2 - 20) / 2;

        // Card 1: Total Clicks
        page.drawRectangle({
            x: MARGIN, y: y - 60,
            width: cardWidth, height: 70,
            color: colors.light,
            borderColor: colors.border,
            borderWidth: 1,
        });
        page.drawText('Total Clicks', {
            x: MARGIN + 15, y: y - 25,
            size: 11, font: helvetica, color: colors.muted,
        });
        page.drawText(totalClicks.toLocaleString(), {
            x: MARGIN + 15, y: y - 50,
            size: 28, font: helveticaBold, color: colors.dark,
        });

        // Card 2: Unique Sessions
        page.drawRectangle({
            x: MARGIN + cardWidth + 20, y: y - 60,
            width: cardWidth, height: 70,
            color: colors.light,
            borderColor: colors.border,
            borderWidth: 1,
        });
        page.drawText('Unique Sessions', {
            x: MARGIN + cardWidth + 35, y: y - 25,
            size: 11, font: helvetica, color: colors.muted,
        });
        page.drawText(uniqueSessions.toLocaleString(), {
            x: MARGIN + cardWidth + 35, y: y - 50,
            size: 28, font: helveticaBold, color: colors.dark,
        });

        y -= 100;

        // Top Pages Section
        page.drawText('Top Pages', {
            x: MARGIN, y,
            size: 18,
            font: helveticaBold,
            color: colors.dark,
        });
        y -= 30;

        // Table Header
        page.drawRectangle({
            x: MARGIN, y: y - 5,
            width: PAGE_WIDTH - MARGIN * 2, height: 25,
            color: colors.indigo,
        });
        page.drawText('Page Path', {
            x: MARGIN + 10, y: y + 3,
            size: 10, font: helveticaBold, color: colors.white,
        });
        page.drawText('Visits', {
            x: PAGE_WIDTH - MARGIN - 60, y: y + 3,
            size: 10, font: helveticaBold, color: colors.white,
        });
        y -= 30;

        // Table Rows
        for (const [idx, pg] of topPages.entries()) {
            const rowColor = idx % 2 === 0 ? colors.white : colors.light;
            page.drawRectangle({
                x: MARGIN, y: y - 5,
                width: PAGE_WIDTH - MARGIN * 2, height: 25,
                color: rowColor,
            });
            page.drawText(pg.path.substring(0, 50), {
                x: MARGIN + 10, y: y + 3,
                size: 10, font: helvetica, color: colors.dark,
            });
            page.drawText(pg.visits.toLocaleString(), {
                x: PAGE_WIDTH - MARGIN - 60, y: y + 3,
                size: 10, font: helveticaBold, color: colors.indigo,
            });
            y -= 25;
        }

        y -= 30;

        // Device Stats Section
        page.drawText('Device Breakdown', {
            x: MARGIN, y,
            size: 18,
            font: helveticaBold,
            color: colors.dark,
        });
        y -= 30;

        for (const d of deviceStats) {
            page.drawText(`${d.device}: ${d.count.toLocaleString()} sessions`, {
                x: MARGIN + 10, y,
                size: 12, font: helvetica, color: colors.dark,
            });
            y -= 22;
        }

        // Footer
        page.drawText(`Generated by Navlens Analytics on ${new Date().toLocaleDateString()}`, {
            x: MARGIN, y: 30,
            size: 9, font: helvetica, color: colors.muted,
        });
        page.drawText(`Page 1`, {
            x: PAGE_WIDTH - MARGIN - 40, y: 30,
            size: 9, font: helvetica, color: colors.muted,
        });

        // ============ PAGES 2+: Heatmaps ============
        let pageNum = 2;
        for (const [pagePath, base64Image] of Object.entries(heatmapImages)) {
            try {
                const heatmapPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

                // Header
                heatmapPage.drawRectangle({
                    x: 0, y: PAGE_HEIGHT - 60,
                    width: PAGE_WIDTH, height: 60,
                    color: colors.indigo,
                });
                heatmapPage.drawText('Heatmap Analysis', {
                    x: MARGIN, y: PAGE_HEIGHT - 40,
                    size: 20, font: helveticaBold, color: colors.white,
                });
                heatmapPage.drawText(pagePath, {
                    x: MARGIN, y: PAGE_HEIGHT - 55,
                    size: 11, font: helvetica, color: rgb(0.9, 0.9, 0.95),
                });

                // Embed heatmap image
                const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
                let embeddedImage;
                
                if (base64Image.includes('image/png')) {
                    embeddedImage = await pdfDoc.embedPng(Buffer.from(imageData, 'base64'));
                } else {
                    embeddedImage = await pdfDoc.embedJpg(Buffer.from(imageData, 'base64'));
                }

                const imgAspect = embeddedImage.width / embeddedImage.height;
                const maxWidth = PAGE_WIDTH - MARGIN * 2;
                const maxHeight = PAGE_HEIGHT - 180;
                
                let imgWidth = maxWidth;
                let imgHeight = imgWidth / imgAspect;
                
                if (imgHeight > maxHeight) {
                    imgHeight = maxHeight;
                    imgWidth = imgHeight * imgAspect;
                }

                heatmapPage.drawImage(embeddedImage, {
                    x: (PAGE_WIDTH - imgWidth) / 2,
                    y: PAGE_HEIGHT - 80 - imgHeight - 20,
                    width: imgWidth,
                    height: imgHeight,
                });

                // Caption
                heatmapPage.drawText('* Click heatmap overlay. Warmer colors indicate higher engagement.', {
                    x: MARGIN, y: 50,
                    size: 9, font: helvetica, color: colors.muted,
                });

                // Footer
                heatmapPage.drawText(`Page ${pageNum}`, {
                    x: PAGE_WIDTH - MARGIN - 40, y: 30,
                    size: 9, font: helvetica, color: colors.muted,
                });

                pageNum++;
            } catch (err) {
                console.error('[Report API] Failed to embed heatmap for:', pagePath, err);
            }
        }

        // 4. Save and Return
        const pdfBytes = await pdfDoc.save();
        
        console.log('[Report API] PDF generated successfully, size:', pdfBytes.length);

        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Navlens-Report-${site.domain.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
            },
        });

    } catch (error) {
        console.error('Report Generation Error:', error);
        return NextResponse.json({ 
            error: 'Internal Server Error', 
            details: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
    }
}
