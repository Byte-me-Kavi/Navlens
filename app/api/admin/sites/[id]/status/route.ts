import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server-admin';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const cookieStore = await cookies();
        const adminSession = cookieStore.get('admin_session');
        if (!adminSession?.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const siteId = resolvedParams.id;
        const { status } = await request.json(); // 'active', 'banned'

        if (!['active', 'banned'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const supabase = createClient();

        const { error } = await supabase
            .from('sites')
            .update({ status })
            .eq('id', siteId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('[AdminSiteStatus] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
