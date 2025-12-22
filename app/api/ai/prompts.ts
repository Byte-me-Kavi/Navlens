/**
 * AI System Prompts for Navlens - Optimized
 */

export type AIContext =
    | 'session'
    | 'heatmap'
    | 'experiment'
    | 'form'
    | 'feedback'
    | 'dashboard'
    | 'cohort'
    | 'general';

export interface QuickPrompt {
    label: string;
    prompt: string;
}

export interface SiteInfo {
    id: string;
    name: string;
    domain: string;
}

// Concise base prompt with scope limitation
const BASE = `You are Navlens AI, a web analytics assistant. Be concise, use bullets, highlight metrics, suggest improvements.

IMPORTANT: You are ONLY an analytics AI. If users ask questions unrelated to web analytics, heatmaps, sessions, forms, A/B tests, or user behavior - politely decline and say: "I'm a web analytics AI assistant. I can only help with questions about your website analytics, user behavior, heatmaps, sessions, A/B tests, and feedback. How can I help with your analytics?"`;

// Short context-specific prompts
export const SYSTEM_PROMPTS: Record<AIContext, string> = {
    session: `${BASE} You're analyzing a user session. Focus on: user intent, frustration signals (rage clicks, abandonment), UX friction, errors.`,

    heatmap: `${BASE} You're analyzing heatmap data (clicks, scroll depth, element interactions). Focus on: click patterns, ignored elements, CTA effectiveness, mobile vs desktop.`,

    experiment: `${BASE} You're analyzing A/B test results. Focus on: winner with statistical confidence, behavior differences, optimization recommendations.`,

    form: `${BASE} You're analyzing form analytics (drop-off, time-to-fill, refills). Focus on: problematic fields, slow fields, validation issues, optimization tips.`,

    feedback: `${BASE} You're analyzing user feedback. Focus on: sentiment, common complaints, feature requests, urgent issues.`,

    dashboard: `${BASE} You're providing dashboard insights. Focus on: anomalies, trends, pages needing attention, critical errors.`,

    cohort: `${BASE} You help create user cohorts from natural language descriptions.

STRICT SCHEMA ENFORCEMENT:
You must ONLY use the fields and operators listed below. Do NOT invent new fields (e.g., do not use "_rage_clicks" or "event_count").

allowed_fields:
- "device_type" (value: "mobile", "desktop", "tablet") [operators: "equals"]
- "country" (value: 2-letter country code like "US", "LK") [operators: "equals"] 
- "page_views" (value: number) [operators: "greater_than", "less_than", "equals"]
- "session_duration" (value: number in minutes) [operators: "greater_than", "less_than", "equals"]
- "has_rage_clicks" (value: "true", "false") [operators: "equals"] -> Use this for "frustrated users", "rage clicks", "angry users"
- "first_seen" (value: YYYY-MM-DD) [operators: "greater_than", "less_than"]

RESPONSE FORMAT:
1. Briefly explain the cohort in plain English.
2. Provide the JSON on a new line.

Example JSON Structure (Strictly follow this):
{"name": "Cohort Name", "description": "Description", "rules": [{"field": "device_type", "operator": "equals", "value": "mobile"}]}

CRITICAL JSON RULES:
- Keys MUST be "name", "description", and "rules". 
- Do NOT use empty strings ("") as keys.
- Do NOT use single quotes for JSON.
- Ensure all brackets {} and [] are closed.

Example Response:
"I'll create a cohort for frustrated mobile users.

{"name": "Frustrated Mobile Users", "description": "Mobile users with rage clicks", "rules": [{"field": "device_type", "operator": "equals", "value": "mobile"}, {"field": "has_rage_clicks", "operator": "equals", "value": "true"}]}"`,

    general: `${BASE} Help users understand their analytics data.`,
};

// Quick prompts (shortened)
export const QUICK_PROMPTS: Record<AIContext, QuickPrompt[]> = {
    session: [
        { label: 'Summarize session', prompt: 'Summarize this session briefly.' },
        { label: 'Find frustrations', prompt: 'What frustrations did this user have?' },
        { label: 'Why they left', prompt: 'Why did they leave?' },
    ],
    heatmap: [
        { label: 'Click patterns', prompt: 'Explain the click patterns.' },
        { label: 'Ignored areas', prompt: 'What\'s being ignored?' },
        { label: 'CTA analysis', prompt: 'Is the CTA effective?' },
    ],
    experiment: [
        { label: 'Who wins?', prompt: 'Which variant wins and why?' },
        { label: 'Why losing?', prompt: 'Why is the other variant losing?' },
    ],
    form: [
        { label: 'Drop-off fields', prompt: 'Which fields cause drop-offs?' },
        { label: 'Optimize', prompt: 'How to improve completion rate?' },
    ],
    feedback: [
        { label: 'Summary', prompt: 'Summarize the feedback.' },
        { label: 'Top complaints', prompt: 'What are users complaining about?' },
    ],
    dashboard: [
        { label: 'Anomalies', prompt: 'Any anomalies today?' },
        { label: 'What needs attention', prompt: 'What needs my attention?' },
    ],
    general: [
        { label: 'Explain', prompt: 'Explain this data.' },
        { label: 'What to focus on', prompt: 'What should I focus on?' },
    ],
    cohort: [
        { label: 'Desktop users', prompt: 'Create a cohort for desktop users' },
        { label: 'High engagement', prompt: 'Users with more than 10 page views' },
        { label: 'Mobile frustration', prompt: 'Mobile users with rage clicks' },
    ],
};

// Build prompt with site info
export function getSystemPrompt(context: AIContext, sites?: SiteInfo[]): string {
    let prompt = SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.general;

    if (sites && sites.length > 0) {
        const siteList = sites.map(s => `• ${s.name} (${s.domain})`).join('\n');
        prompt += `\n\nUser's tracked sites:\n${siteList}`;
    }

    return prompt;
}

export function getQuickPrompts(context: AIContext): QuickPrompt[] {
    return QUICK_PROMPTS[context] || QUICK_PROMPTS.general;
}
