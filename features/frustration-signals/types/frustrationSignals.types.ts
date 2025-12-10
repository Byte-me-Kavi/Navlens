// Frustration Signals Types

export interface FrustrationSession {
    sessionId: string;
    frustrationScore: number;
    deadClicks: number;
    rageClicks: number;
    confusionScrolls: number;
    erraticMovements: number;
}

export interface FrustrationBreakdown {
    low: number;
    medium: number;
    high: number;
}

export interface SignalTotals {
    dead_clicks: number;
    rage_clicks: number;
    confusion_scrolls: number;
    erratic_movements: number;
}

export interface FrustrationSignalsData {
    totalSessions: number;
    avgFrustrationScore: number;
    frustrationBreakdown: FrustrationBreakdown;
    signalTotals: SignalTotals;
    topFrustratedSessions: FrustrationSession[];
}

// Hover Heatmap Types

export interface HeatmapPoint {
    selector: string;
    tag: string;
    zone: string;
    duration: number;
    count: number;
    avgDuration: number;
    x: number;
    y: number;
    intensity: number;
}

export interface AttentionZone {
    zone: string;
    totalTimeMs: number;
    eventCount: number;
    uniqueSessions: number;
    percentage: number;
}

export interface HoverHeatmapData {
    totalHoverTimeMs: number;
    heatmapPoints: HeatmapPoint[];
    attentionZones: AttentionZone[];
}

// Cursor Paths Types

export interface SessionPath {
    sessionId: string;
    totalDistance: number;
    directionChanges: number;
    erraticSegments: number;
    pathSegments: number;
    pattern: 'focused' | 'exploring' | 'lost' | 'minimal';
    directnessScore: number;
    duration: number;
}

export interface PatternBreakdown {
    focused: number;
    exploring: number;
    lost: number;
    minimal: number;
}

export interface CursorPathsData {
    totalSessions: number;
    avgDistance: number;
    avgDirectionChanges: number;
    erraticSessions: number;
    erraticPercentage: number;
    patternBreakdown: PatternBreakdown;
    sessions: SessionPath[];
}
