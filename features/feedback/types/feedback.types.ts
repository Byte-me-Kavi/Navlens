/**
 * Feedback Types
 * 
 * TypeScript interfaces for the enhanced Voice of Customer feedback system
 */

// Pre-defined issue types for choice-based feedback
export const ISSUE_OPTIONS = [
    { code: 'cant_find', label: "Couldn't find what I need", icon: '🔍' },
    { code: 'page_slow', label: 'Page too slow', icon: '🐢' },
    { code: 'confusing_nav', label: 'Confusing navigation', icon: '🧭' },
    { code: 'missing_info', label: 'Missing information', icon: '📝' },
    { code: 'technical_error', label: 'Technical error', icon: '⚠️' },
    { code: 'other', label: 'Other', icon: '💬' },
] as const;

export type IssueCode = typeof ISSUE_OPTIONS[number]['code'];

// User intent options
export const INTENT_OPTIONS = [
    { code: 'buy', label: 'Buy', icon: '🛒' },
    { code: 'learn', label: 'Learn', icon: '📖' },
    { code: 'help', label: 'Get Help', icon: '❓' },
    { code: 'compare', label: 'Compare', icon: '🔍' },
    { code: 'browse', label: 'Just Browsing', icon: '👀' },
] as const;

export type IntentCode = typeof INTENT_OPTIONS[number]['code'];

// Rating scale (1-5 emoji scale)
export const RATING_OPTIONS = [
    { value: 1, emoji: '😡', label: 'Very Bad' },
    { value: 2, emoji: '😕', label: 'Bad' },
    { value: 3, emoji: '😐', label: 'Okay' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '😍', label: 'Great' },
] as const;

// Survey trigger types
export type SurveyTrigger =
    | 'exit_intent'
    | 'frustration'
    | 'long_page_time'
    | 'scroll_bounce'
    | 'manual';

// Feedback submission data
export interface FeedbackSubmission {
    siteId: string;
    sessionId: string;
    visitorId?: string;
    rating?: number;
    intent?: IntentCode;
    issues?: IssueCode[];
    message?: string;
    pagePath: string;
    pageUrl: string;
    deviceType: string;
    userAgent: string;
    surveyType?: SurveyTrigger;
    triggerReason?: string;
    dismissible?: boolean;
}

// Feedback response from API
export interface FeedbackResponse {
    success: boolean;
    feedbackId?: string;
    error?: string;
}

// Feedback widget configuration
export interface FeedbackWidgetConfig {
    enabled: boolean;
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    primaryColor: string;
    showExitIntent: boolean;
    showFrustrationSurvey: boolean;
    minTimeBeforeSurvey: number; // seconds
    allowDismiss: boolean;
}

// Default widget configuration
export const DEFAULT_FEEDBACK_CONFIG: FeedbackWidgetConfig = {
    enabled: true,
    position: 'bottom-right',
    primaryColor: '#3b82f6',
    showExitIntent: true,
    showFrustrationSurvey: true,
    minTimeBeforeSurvey: 30, // 30 seconds
    allowDismiss: true,
};

// Feedback dashboard item
export interface FeedbackItem {
    id: string;
    sessionId: string;
    rating: number | null;
    intent: IntentCode | null;
    issues: IssueCode[];
    message: string | null;
    pagePath: string;
    deviceType: string;
    surveyType: SurveyTrigger | null;
    createdAt: string;
}

// Feedback dashboard stats
export interface FeedbackStats {
    totalFeedback: number;
    avgRating: number | null;
    intentBreakdown: Record<IntentCode, number>;
    issueBreakdown: Record<IssueCode, number>;
    ratingDistribution: number[];
    feedbackTrend: Array<{ date: string; count: number; avgRating: number }>;
}
