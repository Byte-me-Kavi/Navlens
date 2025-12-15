/**
 * A/B Testing Types
 * 
 * Type definitions for the Navlens Experimentation Engine.
 * Supports multiple concurrent experiments per user.
 */

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

// Goal Types
export type GoalType = 'click' | 'pageview' | 'form_submit' | 'custom_event' | 'scroll_depth' | 'time_on_page' | 'revenue';
export type UrlMatchType = 'exact' | 'contains' | 'regex';

/**
 * Goal definition for experiments
 * Supports multiple goal types with type-specific configuration
 */
export interface ExperimentGoal {
    id: string;
    name: string;                    // Human-readable name
    type: GoalType;
    is_primary: boolean;             // Primary goal for winner determination

    // Click goal config
    selector?: string;               // CSS selector for click target

    // Pageview goal config  
    url_pattern?: string;            // URL to match
    url_match?: UrlMatchType;        // Match strategy

    // Custom event config
    event_name?: string;             // Event name to track
    event_properties?: Record<string, unknown>;  // Required properties

    // Scroll depth config
    depth_percentage?: number;       // 0-100 threshold

    // Time on page config
    seconds?: number;                // Time threshold

    // Revenue config
    track_value?: boolean;           // Track monetary value
    value_field?: string;            // Property containing value
    currency?: string;               // ISO currency code
}

export interface Variant {
    id: string;
    name: string;           // 'control', 'variant_a', 'variant_b', etc.
    weight: number;         // 0-100 for unequal traffic splits
    description?: string;
}

export interface Experiment {
    id: string;
    site_id: string;
    name: string;
    description?: string;
    status: ExperimentStatus;
    variants: Variant[];
    traffic_percentage: number;     // % of total traffic included (0-100)
    goals?: ExperimentGoal[];       // NEW: Multiple goals
    goal_event?: string;            // DEPRECATED: Keep for backward compat
    target_urls?: string[];         // URLs where experiment is active (empty = all)
    created_at: string;
    updated_at: string;
    started_at?: string;
    ended_at?: string;
}

export interface ExperimentAssignment {
    experiment_id: string;
    variant_id: string;
    assigned_at: number;            // Unix timestamp
}

export interface ExperimentAssignments {
    [experimentId: string]: string; // experimentId -> variantId
}

/**
 * Per-goal conversion results
 */
export interface GoalResults {
    goal_id: string;
    goal_name: string;
    goal_type: GoalType;
    is_primary: boolean;
    conversions: number;
    conversion_rate: number;
    // Revenue metrics (for revenue goals)
    total_revenue?: number;
    avg_order_value?: number;
    revenue_per_visitor?: number;
}

export interface VariantStats {
    variant_id: string;
    variant_name: string;
    users: number;
    conversions: number;
    conversion_rate: number;
    // Per-goal breakdown
    goals?: GoalResults[];
}

export interface ExperimentResults {
    experiment_id: string;
    experiment_name: string;
    status: ExperimentStatus;
    total_users: number;
    variants: VariantStats[];
    winner?: string;
    confidence_level?: number;
    z_score?: number;
    lift_percentage?: number;
    is_significant: boolean;
    started_at?: string;
    days_running: number;
}

// API request/response types
export interface CreateExperimentRequest {
    name: string;
    description?: string;
    variants: Pick<Variant, 'name' | 'weight'>[];
    traffic_percentage?: number;
    goals?: Omit<ExperimentGoal, 'id'>[];  // Goals without IDs (server generates)
    goal_event?: string;                    // Deprecated
    target_urls?: string[];
}

export interface UpdateExperimentRequest extends Partial<CreateExperimentRequest> {
    status?: ExperimentStatus;
}

// Goal creation helper type
export type CreateGoalRequest = Omit<ExperimentGoal, 'id'>;
