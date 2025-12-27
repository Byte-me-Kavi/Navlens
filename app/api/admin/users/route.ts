import { NextResponse, NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server-admin';
import { withMonitoring } from "@/lib/api-middleware";
import { verifyAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GET_handler(request: NextRequest) {
    try {
        // 1. Security Check
        const isAdmin = await verifyAdminSession();

        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Pagination
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = parseInt(searchParams.get('perPage') || '50');

        // 3. Fetch Users
        const supabase = createClient();

        // listUsers returns { data: { users: [] }, error }
        const { data, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: perPage,
        });

        if (error) {
            console.error('[AdminUsers] Fetch failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 4. Transform Data & Fetch Details
        const users = data.users;
        const userIds = users.map(u => u.id);

        if (userIds.length === 0) {
            return NextResponse.json({
                users: [],
                total: data.total,
                page,
                perPage
            });
        }

        // Batch fetch additional details
        const [subscriptionsResult, sitesResult] = await Promise.all([
            supabase.from('subscriptions')
                .select('user_id, subscription_plans(name)')
                .in('user_id', userIds)
                .eq('status', 'active'),

            supabase.from('sites')
                .select('user_id')
                .in('user_id', userIds)
        ]);

        // Create lookups
        const subMap: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscriptionsResult.data?.forEach((sub: any) => {
            const plan = sub.subscription_plans;
            // Handle array or object return from join
            const planName = Array.isArray(plan) ? plan[0]?.name : plan?.name;
            subMap[sub.user_id] = planName || 'Free';
        });

        const siteCountMap: Record<string, number> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sitesResult.data?.forEach((site: any) => {
            siteCountMap[site.user_id] = (siteCountMap[site.user_id] || 0) + 1;
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedUsers = users.map((u: any) => ({ // Cast to any to fix missing type defs for banned_until
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in: u.last_sign_in_at,
            banned_until: u.banned_until,
            confirmed_at: u.confirmed_at,
            is_banned: u.banned_until && new Date(u.banned_until) > new Date(),
            // New Fields
            plan_name: subMap[u.id] || 'Free',
            sites_count: siteCountMap[u.id] || 0
        }));

        return NextResponse.json({
            users: transformedUsers,
            total: data.total,
            page,
            perPage
        });
    } catch (error: unknown) {
        console.error('[AdminUsers] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const GET = withMonitoring(GET_handler);
