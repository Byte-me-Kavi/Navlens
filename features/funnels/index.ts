/**
 * Funnels Feature - Main Entry Point
 * 
 * Provides conversion funnel tracking and analysis capabilities.
 * Tracks user journeys through defined step sequences to measure
 * drop-off rates and optimize conversion paths.
 */

// Types
export type {
  Funnel,
  FunnelStep,
  FunnelStepResult,
  FunnelAnalysis,
  StepCondition,
  StepConditionType,
  CreateFunnelRequest,
  UpdateFunnelRequest,
  FunnelWithStats,
  FunnelAnalysisParams,
  ListFunnelsParams,
} from './types/funnel.types';

// Components
export {
  FunnelChart,
  FunnelCard,
  FunnelStepEditor,
  CreateFunnelModal,
} from './components';

// Hooks
export {
  useFunnels,
  useFunnelAnalysis,
} from './hooks';

// Services
export { funnelApi } from './services/funnelApi';
