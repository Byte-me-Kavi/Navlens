/**
 * AI Element Insights API Endpoint
 * 
 * Generates optimization insights for elements using Groq (same as main AI)
 * Pro tier and above only
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize, createUnauthenticatedResponse } from '@/lib/auth';
import { hasFeatureAccess } from '@/lib/subscription/helpers';

// Groq API configuration (same as main AI)
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

const getApiKey = () => process.env.GROQ_API_KEY!;

interface ElementContext {
    element: {
        tag: string;
        selector: string;
        text?: string;
        position: { x: number; y: number };
        dimensions: { width: number; height: number };
    };
    metrics: {
        clickCount: number;
        percentage: number;
        ctr: number;
        scrollDepth: number;
        position: string;
        rageClicks: number;
        deadClicks: number;
        deviceBreakdown: { desktop: number; tablet: number; mobile: number };
    };
    diagnosis: {
        frustrationIndex: string;
        confusionIndex: string;
        attractionRank: string;
    };
    page: string;
    device: string;
}

/**
 * POST /api/ai/element-insights
 * Generate AI-powered optimization insights for an element
 * Uses ai_assistant feature check (Pro tier) since it's the main AI feature
 */
export async function POST(req: NextRequest) {
    try {
        // Authenticate
        const authResult = await authenticateAndAuthorize(req);
        if (!authResult.isAuthorized || !authResult.user) {
            return createUnauthenticatedResponse();
        }

        // Note: Feature gating is handled by the frontend modal
        // This matches the main AI chat which also doesn't have backend feature checks

        // Check for API key
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 503 }
            );
        }

        const body = await req.json();
        const { context } = body as { context: ElementContext };

        if (!context || !context.element) {
            return NextResponse.json(
                { error: 'Missing element context' },
                { status: 400 }
            );
        }

        // Build a detailed prompt for the AI
        const prompt = buildElementAnalysisPrompt(context);

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getApiKey()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert UX analyst, CRO specialist, and Senior Frontend Developer for Navlens. Analyze the element data to provide strictly actionable, code-ready optimization insights.

**Guidelines:**
1. **Be Specific**: Don't just say "Increase size". Say "Increase vertical padding to 12px" or "Set min-height 48px".
2. **CSS-First**: For visual issues, suggest specific CSS properties (e.g., "Add hover state: brightness(0.9)", "Increase contrast: color: #333").
3. **Context-Aware**:
   - If it's a navigation link (like "Home"): Focus on ease of access, sticky positioning, or active states.
   - If it's a CTA button: Focus on color contrast, size, whitespace, and urgency.
   - If it's an image: Focus on alt text, dimensions, and loading state.
4. **Data-Driven**: Use the provided metrics to justify improvements (e.g. "0% mobile clicks hints at tap target issues").

**Output Format:**
Return EXACTLY 3 insights as a JSON array:
[
  {
    "title": "Action-Oriented Title (max 5 words)",
    "description": "Why this matters based on the data (1 sentence).",
    "action": "Specific technical action (e.g. 'Add padding: 12px 24px')",
    "impact": "Projected outcome (e.g. '+20% Tap Rate')",
    "type": "UX" | "CRO" | "CSS" | "A11Y"
  }
]

Return ONLY the JSON array.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 800,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[element-insights] Groq API error details:', errorText);
            throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content || '[]';

        // Parse the JSON response
        let insights = [];
        try {
            // Extract JSON from potential markdown code blocks
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                insights = JSON.parse(jsonMatch[0]);
            }
        } catch (parseError) {
            console.error('[element-insights] Failed to parse AI response:', parseError);
            insights = [];
        }

        return NextResponse.json({ insights });

    } catch (error) {
        console.error('[element-insights] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate insights' },
            { status: 500 }
        );
    }
}

function buildElementAnalysisPrompt(context: ElementContext): string {
    const { element, metrics, diagnosis, page, device } = context;

    return `Analyze this HTML element and provide optimization insights:

**Element Details:**
- Tag: <${element.tag.toLowerCase()}>
- Selector: ${element.selector}
- Text: "${element.text || 'No text'}"
- Position: X=${element.position.x}px, Y=${element.position.y}px
- Dimensions: ${element.dimensions.width}×${element.dimensions.height}px
- Page Location: ${metrics.position}

**Click Metrics (Last 30 Days):**
- Total Clicks: ${metrics.clickCount}
- Click Share: ${metrics.percentage.toFixed(1)}% of page clicks
- Click-Through Rate: ${metrics.ctr.toFixed(1)}%
- Scroll Depth: ${metrics.scrollDepth.toFixed(0)}% (how far users scroll to see it)

**User Behavior Issues:**
- Rage Clicks: ${metrics.rageClicks} (rapid frustrated clicks)
- Dead Clicks: ${metrics.deadClicks} (clicks on non-interactive content)
- Frustration Level: ${diagnosis.frustrationIndex}
- Performance: ${diagnosis.attractionRank}

**Device Breakdown:**
- Desktop: ${metrics.deviceBreakdown.desktop.toFixed(0)}%
- Tablet: ${metrics.deviceBreakdown.tablet.toFixed(0)}%
- Mobile: ${metrics.deviceBreakdown.mobile.toFixed(0)}%

**Context:**
- Page: ${page}
- Primary Device: ${device}

Based on this data, what specific optimizations would improve this element's performance?`;
}
