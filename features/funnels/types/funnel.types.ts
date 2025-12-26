/**
 * Funnel Types
 * 
 * TypeScript interfaces and types for the Funnels feature
 */

// Condition types for funnel steps
export type StepConditionType = 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'regex';

// Individual step condition
export interface StepCondition {
  type: StepConditionType;
  value: string;
}

// A single step in the funnel
export interface FunnelStep {
  id: string;
  name: string;
  page_path: string;
  order_index: number;
  conditions?: StepCondition[];
}

// Funnel configuration (stored in Supabase)
export interface Funnel {
  id: string;
  site_id: string;
  name: string;
  description?: string;
  steps: FunnelStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Create funnel request
export interface CreateFunnelRequest {
  site_id: string;
  name: string;
  description?: string;
  steps: Omit<FunnelStep, 'id' | 'order_index'>[];
}

// Update funnel request
export interface UpdateFunnelRequest {
  id: string;
  site_id: string;
  name?: string;
  description?: string;
  steps?: Omit<FunnelStep, 'id' | 'order_index'>[];
  is_active?: boolean;
}

// Individual step analysis result
export interface FunnelStepResult {
  step_id: string;
  step_name: string;
  order_index: number;
  visitors: number;
  conversion_rate: number;
  drop_off_rate: number;
}

// Full funnel analysis result (from ClickHouse)
export interface FunnelAnalysis {
  total_sessions: number;
  overall_conversion_rate: number;
  step_results: FunnelStepResult[];
  analyzed_at: string;
  funnel?: Funnel;
}

// API params for funnel analysis
export interface FunnelAnalysisParams {
  funnelId: string;
  siteId: string;
  startDate?: string;
  endDate?: string;
  shareToken?: string;
}

// List funnels params
export interface ListFunnelsParams {
  siteId: string;
  shareToken?: string;
}

// Funnel with stats preview for list display
export interface FunnelWithStats extends Funnel {
  lastAnalysis?: {
    overall_conversion_rate: number;
    total_sessions: number;
    analyzed_at: string;
  };
}
