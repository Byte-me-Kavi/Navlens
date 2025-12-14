/**
 * A/B Testing Types
 * 
 * Type definitions for the Navlens Experimentation Engine.
 * Supports multiple concurrent experiments per user.
 */

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

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
    goal_event?: string;            // e.g., 'conversion', 'signup', 'purchase'
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

export interface VariantStats {
    variant_id: string;
    variant_name: string;
    users: number;
    conversions: number;
    conversion_rate: number;
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
    goal_event?: string;
    target_urls?: string[];
}

export interface UpdateExperimentRequest extends Partial<CreateExperimentRequest> {
    status?: ExperimentStatus;
}
