// Frustration Signals Feature
// Export all components, hooks, types, and services

// Components
export { FrustrationSignalsPanel } from './components/FrustrationSignalsPanel';
export { AttentionZonesChart } from './components/AttentionZonesChart';
export { CursorPathsPanel } from './components/CursorPathsPanel';
export { RageClickOverlay } from './components/RageClickOverlay';
export type { RageClickPoint } from './components/RageClickOverlay';

// Hooks
export { useFrustrationSignals } from './hooks/useFrustrationSignals';

// Services
export { frustrationSignalsApi } from './services/frustrationSignalsApi';

// Types
export type {
    FrustrationSignalsData,
    FrustrationSession,
    FrustrationBreakdown,
    SignalTotals,
    HoverHeatmapData,
    HeatmapPoint,
    AttentionZone,
    CursorPathsData,
    SessionPath,
    PatternBreakdown,
} from './types/frustrationSignals.types';
