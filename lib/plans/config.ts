export type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface PlanLimit {
    sessions: number; // -1 for unlimited
    recordings: number;
    retention_days: number;
    active_experiments?: number; // undefined = 0 or unlimited if feature enabled? logic needed
    active_surveys?: number;
    heatmaps?: number; // Legacy? Replaced by heatmap_pages
    heatmap_pages?: number; // Number of distinct pages allowed for heatmaps
    max_sites?: number; // Number of sites allowed
}

export interface PlanConfig {
    id: string;
    name: string;
    price: number;
    description: string;
    limits: PlanLimit;
    features: string[];
    status?: 'active' | 'inactive';
}

export const PLAN_FEATURES = {
    ANALYTICS: [
        'click_heatmaps',
        'scroll_heatmaps',
        'live_user_view',
        'hover_heatmaps',
        'funnels',
        'user_journeys',
        'form_analytics',
        'element_clicks'
    ],
    RECORDING: [
        'session_recording',
        'skip_inactivity',
        'session_notes'
    ],
    ISSUES: [
        'frustration_signals',
        'js_errors',
        'performance_metrics',
        'network_health'
    ],
    AI: [
        'ai_session_summaries',
        'ai_heatmap_analysis',
        'ai_form_insights',
        'ai_assistant',
        'ai_cohort_generator',
        'ai_element_insights'
    ],
    EXPERIMENTATION: [
        'ab_testing',
        'surveys'
    ],
    SYSTEM: [
        'feedback_widget',
        'privacy_center',
        'data_export',
        'team_management',
        'api_access',
        'cohorts'
    ]
};

export const PLANS: Record<PlanTier, PlanConfig> = {
    FREE: {
        id: 'free',
        name: 'Free',
        price: 0,
        description: 'Prove the value. For students & hobbyists.',
        limits: {
            sessions: 500,
            recordings: 50,
            retention_days: 3,
            active_experiments: 0,
            active_surveys: 0,
            heatmaps: 10, // Keeping for backward compat
            heatmap_pages: 3,
            max_sites: 1
        },
        features: [
            'click_heatmaps',
            'scroll_heatmaps',
            'live_user_view',
            'session_recording',
            'skip_inactivity',
            'privacy_center'
        ]
    },
    STARTER: {
        id: 'starter',
        name: 'Starter',
        price: 29,
        description: 'See clear behavior. For solopreneurs.',
        limits: {
            sessions: 5000,
            recordings: 1000,
            retention_days: 30,
            active_experiments: 1,
            active_surveys: 1,
            heatmaps: -1,
            heatmap_pages: 8,
            max_sites: 3
        },
        features: [
            // All Free Features
            'click_heatmaps', 'scroll_heatmaps', 'live_user_view', 'session_recording', 'skip_inactivity', 'privacy_center',
            // Unlocked
            'feedback_widget', // Unlocked here
            'hover_heatmaps',
            'frustration_signals',
            'ab_testing',
            'surveys',
            'cohorts'
        ]
    },
    PRO: {
        id: 'pro',
        name: 'Pro',
        price: 79,
        description: 'Monetize intelligence. For agencies & SaaS.',
        limits: {
            sessions: 25000,
            recordings: 5000,
            retention_days: 90,
            active_experiments: -1, // Unlimited
            active_surveys: -1,
            heatmaps: -1,
            heatmap_pages: 15,
            max_sites: 5
        },
        features: [
            // All Starter +
            'click_heatmaps', 'scroll_heatmaps', 'live_user_view', 'session_recording', 'skip_inactivity', 'privacy_center',
            'feedback_widget', 'hover_heatmaps', 'frustration_signals', 'ab_testing', 'surveys',
            // Unlocked AI
            'ai_session_summaries',
            'ai_heatmap_analysis',
            'ai_form_insights',
            'ai_assistant',
            'ai_element_insights',
            // Unlocked Deep Insights
            'funnels',
            'user_journeys',
            'form_analytics',
            'element_clicks',
            // Unlocked Issues
            'js_errors',
            'performance_metrics',
            // Unlocked System
            'team_management',
            'data_export',
            'priority_support',
            'cohorts',
            'ai_cohort_generator'
        ]
    },
    ENTERPRISE: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 299,
        status: 'inactive',
        description: 'Raw data & control. For heavy data orgs.',
        limits: {
            sessions: 150000,
            recordings: 25000,
            retention_days: 365,
            active_experiments: -1,
            active_surveys: -1,
            heatmaps: -1,
            heatmap_pages: -1,
            max_sites: -1
        },
        features: [
            // All Pro +
            'click_heatmaps', 'scroll_heatmaps', 'live_user_view', 'session_recording', 'skip_inactivity', 'privacy_center',
            'feedback_widget', 'hover_heatmaps', 'frustration_signals', 'ab_testing', 'surveys',
            'ai_session_summaries', 'ai_heatmap_analysis', 'ai_form_insights', 'ai_assistant',
            'funnels', 'user_journeys', 'form_analytics', 'element_clicks', 'js_errors', 'performance_metrics',
            'team_management', 'data_export', 'priority_support',
            // Unlocked Enterprise
            'ai_element_insights',
            'ai_cohort_generator',
            'cohorts',
            'network_health',
            'api_access',
            'session_notes',
            'dedicated_support',
            'priority_ai_processing'
        ]
    }
};

export const FEATURE_LABELS: Record<string, string> = {
    click_heatmaps: 'Click Heatmaps',
    scroll_heatmaps: 'Scroll Heatmaps',
    live_user_view: 'Live User View',
    hover_heatmaps: 'Hover/Attention Heatmaps',
    funnels: 'Funnels',
    user_journeys: 'User Journeys',
    form_analytics: 'Form Analytics',
    element_clicks: 'Element Tracking',
    session_recording: 'Session Recordings',
    skip_inactivity: 'Skip Inactivity',
    session_notes: 'Session Notes',
    frustration_signals: 'Frustration Signals (Rage Clicks)',
    js_errors: 'Console Error Tracking',
    performance_metrics: 'Performance Insights (Core Web Vitals)',
    network_health: 'Network Health Monitoring',
    ai_session_summaries: 'AI Session Summaries',
    ai_heatmap_analysis: 'AI Heatmap Analysis',
    ai_form_insights: 'AI Form Insights',
    ai_assistant: 'AI Assistant',
    ai_cohort_generator: 'AI Cohort Generator',
    ai_element_insights: 'AI Element Insights',
    ab_testing: 'A/B Testing',
    surveys: 'Surveys',
    feedback_widget: 'Feedback Widget',
    privacy_center: 'Privacy Center',
    data_export: 'Data Export (CSV/PDF)',
    team_management: 'Team Members (5+)',
    api_access: 'API Access',
    cohorts: 'Advanced Cohorts',
    priority_support: 'Priority Email Support',
    dedicated_support: 'Dedicated Support / Onboarding',
    priority_ai_processing: 'Priority AI Processing'
};
