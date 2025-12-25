import { CSSProperties } from 'react';

// Note: Satori only supports a subset of CSS (Flexbox-based layouts)
// All styles must be inline objects, no external CSS

interface ReportStats {
    totalClicks: number;
    uniqueSessions: number;
    bounceRate?: number;
    avgSessionDuration?: string;
}

interface TopPage {
    path: string;
    visits: number;
}

interface DeviceStat {
    device: string;
    count: number;
}

interface ReportPageProps {
    title: string;
    siteUrl: string;
    dateRange: string;
    stats: ReportStats;
    topPages: TopPage[];
    deviceStats: DeviceStat[];
    pageNumber?: number;
    totalPages?: number;
}

interface HeatmapPageProps {
    siteUrl: string;
    pagePath: string;
    heatmapImageBase64: string;
    pageNumber: number;
    totalPages: number;
}

// Shared styles
const colors = {
    primary: '#6366f1', // Indigo
    dark: '#1f2937',
    muted: '#6b7280',
    light: '#f3f4f6',
    white: '#ffffff',
    border: '#e5e7eb',
};

const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '800px',
    height: '1100px',
    backgroundColor: colors.white,
    padding: '40px',
    fontFamily: 'Inter',
};

const headerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    borderBottom: `2px solid ${colors.primary}`,
    paddingBottom: '20px',
    marginBottom: '30px',
};

const statCardStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    padding: '20px',
    backgroundColor: colors.light,
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
};

const sectionTitleStyle: CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.dark,
    marginBottom: '15px',
    borderLeft: `4px solid ${colors.primary}`,
    paddingLeft: '12px',
};

const footerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '20px',
    borderTop: `1px solid ${colors.border}`,
    fontSize: '10px',
    color: colors.muted,
};

// Main Report Page (Overview)
export const ReportOverviewPage = ({ 
    title, 
    siteUrl, 
    dateRange, 
    stats, 
    topPages, 
    deviceStats,
    pageNumber = 1,
    totalPages = 1
}: ReportPageProps) => (
    <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    backgroundColor: colors.primary, 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.white,
                    fontSize: '20px',
                    fontWeight: 700
                }}>N</div>
                <span style={{ fontSize: '28px', fontWeight: 700, color: colors.dark }}>{title}</span>
            </div>
            <span style={{ fontSize: '14px', color: colors.muted, marginTop: '8px' }}>
                {siteUrl} • {dateRange}
            </span>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <div style={statCardStyle}>
                <span style={{ fontSize: '14px', color: colors.muted, marginBottom: '8px' }}>Total Clicks</span>
                <span style={{ fontSize: '32px', fontWeight: 700, color: colors.dark }}>
                    {stats.totalClicks.toLocaleString()}
                </span>
            </div>
            <div style={statCardStyle}>
                <span style={{ fontSize: '14px', color: colors.muted, marginBottom: '8px' }}>Unique Sessions</span>
                <span style={{ fontSize: '32px', fontWeight: 700, color: colors.dark }}>
                    {stats.uniqueSessions.toLocaleString()}
                </span>
            </div>
            <div style={statCardStyle}>
                <span style={{ fontSize: '14px', color: colors.muted, marginBottom: '8px' }}>Bounce Rate</span>
                <span style={{ fontSize: '32px', fontWeight: 700, color: colors.dark }}>
                    {stats.bounceRate ?? 0}%
                </span>
            </div>
        </div>

        {/* Top Pages Section */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '30px' }}>
            <span style={sectionTitleStyle}>Top Pages</span>
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                backgroundColor: colors.light, 
                borderRadius: '12px',
                overflow: 'hidden',
                border: `1px solid ${colors.border}`
            }}>
                {/* Header Row */}
                <div style={{ 
                    display: 'flex', 
                    padding: '12px 16px', 
                    backgroundColor: colors.primary,
                    color: colors.white,
                    fontWeight: 600,
                    fontSize: '12px'
                }}>
                    <span style={{ flex: 3 }}>Page Path</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>Visits</span>
                </div>
                {/* Data Rows */}
                {topPages.slice(0, 5).map((page, idx) => (
                    <div key={idx} style={{ 
                        display: 'flex', 
                        padding: '12px 16px',
                        borderBottom: idx < topPages.length - 1 ? `1px solid ${colors.border}` : 'none',
                        backgroundColor: idx % 2 === 0 ? colors.white : colors.light
                    }}>
                        <span style={{ flex: 3, fontSize: '13px', color: colors.dark }}>{page.path}</span>
                        <span style={{ flex: 1, textAlign: 'right', fontSize: '13px', fontWeight: 600, color: colors.primary }}>
                            {page.visits.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* Device Stats Section */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={sectionTitleStyle}>Device Breakdown</span>
            <div style={{ display: 'flex', gap: '15px' }}>
                {deviceStats.slice(0, 4).map((d, idx) => (
                    <div key={idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '16px',
                        backgroundColor: colors.light,
                        borderRadius: '12px',
                        border: `1px solid ${colors.border}`,
                        flex: 1
                    }}>
                        <span style={{ fontSize: '12px', color: colors.muted, marginBottom: '8px', textTransform: 'capitalize' }}>
                            {d.device}
                        </span>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: colors.dark }}>
                            {d.count.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
            <span>Generated by Navlens Analytics on {new Date().toLocaleDateString()}</span>
            <span>Page {pageNumber} of {totalPages}</span>
        </div>
    </div>
);

// Heatmap Page
export const HeatmapPage = ({ 
    siteUrl, 
    pagePath, 
    heatmapImageBase64,
    pageNumber,
    totalPages
}: HeatmapPageProps) => (
    <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: colors.dark }}>Heatmap Analysis</span>
            <span style={{ fontSize: '14px', color: colors.muted, marginTop: '8px' }}>
                {siteUrl} • {pagePath}
            </span>
        </div>

        {/* Heatmap Image */}
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            flex: 1,
            backgroundColor: colors.light,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`
        }}>
            <img 
                src={heatmapImageBase64}
                style={{ 
                    width: '100%', 
                    height: '700px', 
                    objectFit: 'contain',
                    borderRadius: '8px'
                }} 
            />
        </div>

        {/* Caption */}
        <span style={{ fontSize: '11px', color: colors.muted, marginTop: '12px', textAlign: 'center' }}>
            * Click heatmap overlay for desktop viewport. Warmer colors indicate higher engagement.
        </span>

        {/* Footer */}
        <div style={footerStyle}>
            <span>Generated by Navlens Analytics</span>
            <span>Page {pageNumber} of {totalPages}</span>
        </div>
    </div>
);
