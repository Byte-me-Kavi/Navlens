import { NextResponse, NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server-admin';
import { withMonitoring } from "@/lib/api-middleware";
import { verifyAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function GET_handler(request: NextRequest) {
    try {
        const isAdmin = await verifyAdminSession();
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const perPage = parseInt(searchParams.get('perPage') || '50');
        const userId = searchParams.get('userId');
        const search = searchParams.get('search');

        const supabase = createClient();

        // 1. Fetch Sites (without join to avoid FK issues)
        let query = supabase
            .from('sites')
            .select('*', { count: 'exact' });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        if (search) {
            // Search by site name or domain
            query = query.or(`site_name.ilike.%${search}%,domain.ilike.%${search}%`);
        }

        // Pagination
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        query = query.range(from, to).order('created_at', { ascending: false });

        const { data: sitesData, error, count } = await query;

        if (error) {
            throw error;
        }

        // 2. Fetch Emails manually using Auth Admin (Profiles table might be incomplete)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userIds = [...new Set((sitesData || []).map((s: any) => s.user_id))];

        const emailMap: Record<string, string> = {};

        // Fetch users in parallel (Auth Admin is required to get email reliably if not in profiles)
        await Promise.all(userIds.map(async (uid: string) => {
            const { data: { user }, error: _error } = await supabase.auth.admin.getUserById(uid);
            if (user && user.email) {
                emailMap[uid] = user.email;
            }
        }));

        // Transform to flat structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sites = (sitesData || []).map((site: any) => ({
            id: site.id,
            site_name: site.site_name,
            domain: site.domain,
            created_at: site.created_at,
            status: site.status || 'active', // Default to active if null
            user_id: site.user_id,
            owner_email: emailMap[site.user_id] || 'Unknown'
        }));

        return NextResponse.json({
            sites,
            total: count,
            page,
            perPage
        });

    } catch (error: unknown) {
        console.error('[AdminSites] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export const GET = withMonitoring(GET_handler);
