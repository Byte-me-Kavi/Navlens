import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndAuthorize, createUnauthorizedResponse, createUnauthenticatedResponse } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { encryptedJsonResponse } from '@/lib/encryption';

// Use service role to bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FeedbackItem {
    feedback_type: string;
    rating: number | null;
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await authenticateAndAuthorize(request);
        if (!authResult.isAuthorized) {
            return authResult.user ? createUnauthorizedResponse() : createUnauthenticatedResponse();
        }

        const body = await request.json();
        const { siteId, startDate, endDate, feedbackType, page = 1, limit = 50 } = body;

        if (!siteId) {
            return NextResponse.json({ error: 'Missing siteId parameter' }, { status: 400 });
        }

        // Build query
        let query = supabaseAdmin
            .from('feedback')
            .select('*', { count: 'exact' })
            .eq('site_id', siteId)
            .order('created_at', { ascending: false });

        // Apply filters
        if (startDate) {
            query = query.gte('created_at', startDate);
        }
        if (endDate) {
            query = query.lte('created_at', endDate);
        }
        if (feedbackType && feedbackType !== 'all') {
            query = query.eq('feedback_type', feedbackType);
        }

        // Pagination
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        const { data: feedback, error, count } = await query;

        if (error) {
            console.error('[dashboard/feedback] Query error:', error);
            return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
        }

        // Get summary stats
        const { data: stats } = await supabaseAdmin
            .from('feedback')
            .select('feedback_type, rating')
            .eq('site_id', siteId)
            .gte('created_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        // Calculate stats
        const typeCounts: Record<string, number> = {};
        let totalRating = 0;
        let ratingCount = 0;

        (stats as FeedbackItem[] | null)?.forEach((item: FeedbackItem) => {
            typeCounts[item.feedback_type] = (typeCounts[item.feedback_type] || 0) + 1;
            if (item.rating !== null) {
                totalRating += item.rating;
                ratingCount++;
            }
        });

        const avgRating = ratingCount > 0 ? totalRating / ratingCount : null;

        return encryptedJsonResponse({
            feedback: feedback || [],
            totalCount: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
            stats: {
                typeCounts,
                avgRating: avgRating ? parseFloat(avgRating.toFixed(2)) : null,
                totalFeedback: stats?.length || 0,
            },
        });
    } catch (error) {
        console.error('[dashboard/feedback] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
