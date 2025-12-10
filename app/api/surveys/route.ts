import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { validators } from '@/lib/validation';
import { unstable_cache } from 'next/cache';

interface Survey {
    id: string;
    name: string;
    type: string;
    trigger_type: string;
    trigger_config: Record<string, unknown>;
    questions: Array<{
        id: string;
        type: string;
        text: string;
        options?: string[];
    }>;
    display_frequency: string;
    targeting_rules: Record<string, unknown>;
}

// Cache surveys for 5 minutes
const getCachedSurveys = unstable_cache(
    async (siteId: string) => {
        const { data, error } = await supabase
            .from('surveys')
            .select('id, name, type, trigger_type, trigger_config, questions, display_frequency, targeting_rules')
            .eq('site_id', siteId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[surveys] Query error:', error);
            return [];
        }

        return data as Survey[];
    },
    ['active-surveys'],
    { revalidate: 300 } // 5 minutes
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('site_id');
        const pagePath = searchParams.get('page_path');
        const deviceType = searchParams.get('device_type');

        if (!siteId) {
            return NextResponse.json({ error: 'Missing site_id parameter' }, { status: 400 });
        }

        if (!validators.isValidUUID(siteId)) {
            return NextResponse.json({ error: 'Invalid site_id format' }, { status: 400 });
        }

        // Get cached surveys
        const surveys = await getCachedSurveys(siteId);

        // Filter by targeting rules
        const filteredSurveys = surveys.filter((survey) => {
            const rules = survey.targeting_rules || {};

            // Check page targeting
            if (rules.pages && Array.isArray(rules.pages) && rules.pages.length > 0) {
                if (pagePath && !rules.pages.some((p: string) =>
                    pagePath === p || pagePath.startsWith(p.replace('*', ''))
                )) {
                    return false;
                }
            }

            // Check device targeting
            if (rules.device && Array.isArray(rules.device) && rules.device.length > 0) {
                if (deviceType && !rules.device.includes(deviceType)) {
                    return false;
                }
            }

            return true;
        });

        // Return only necessary fields for client
        const clientSurveys = filteredSurveys.map((s) => ({
            id: s.id,
            type: s.type,
            trigger_type: s.trigger_type,
            trigger_config: s.trigger_config,
            questions: s.questions,
            display_frequency: s.display_frequency,
        }));

        return NextResponse.json(
            { surveys: clientSurveys },
            {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                },
            }
        );
    } catch (error) {
        console.error('[surveys] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
