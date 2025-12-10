/**
 * Form Analytics Types
 * Types for form field tracking and analytics
 */

// Form summary from API
export interface FormSummary {
    form_id: string;
    form_url: string;
    total_sessions: number;
    total_submissions: number;
    total_abandons: number;
    completion_rate: number;
    avg_time_seconds: number;
    last_activity: string;
}

// Field-level metrics
export interface FieldMetrics {
    field_id: string;
    field_name: string;
    field_type: string;
    field_index: number;
    focus_count: number;
    blur_count: number;
    submit_count: number;
    abandon_count: number;
    refill_count: number;
    avg_time_ms: number;
    drop_off_rate: number;
    refill_rate: number;
}

// API response
export interface FormAnalyticsResponse {
    forms?: FormSummary[];
    fields?: FieldMetrics[];
    summary?: {
        total_forms: number;
        total_submissions: number;
        avg_completion_rate: number;
    };
}

// Date range filter options
export type DateRangeOption = '7d' | '14d' | '30d' | '90d';

// Component props
export interface FormSelectorProps {
    forms: FormSummary[];
    selectedFormId: string | null;
    onSelect: (formId: string) => void;
    isLoading?: boolean;
}

export interface FormOverviewCardProps {
    form: FormSummary;
}

export interface FieldMetricsTableProps {
    fields: FieldMetrics[];
    onViewSessions?: (fieldId: string) => void;
}

export interface DropoffFunnelProps {
    fields: FieldMetrics[];
    formName?: string;
}

export interface TimeToFillChartProps {
    fields: FieldMetrics[];
}

// Hook options
export interface UseFormListOptions {
    siteId: string;
    days?: number;
    enabled?: boolean;
}

export interface UseFormMetricsOptions {
    siteId: string;
    formId: string | null;
    days?: number;
    enabled?: boolean;
}
