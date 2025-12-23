import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ siteId: string }> }
) {
    try {
        const { siteId } = await params;
        const { is_tracking_enabled } = await request.json();

        if (typeof is_tracking_enabled !== 'boolean') {
            return NextResponse.json({ error: 'is_tracking_enabled must be a boolean' }, { status: 400 });
        }

        const supabase = await createClient();

        // Verify user owns this site
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Update the site
        const { data, error } = await supabase
            .from('sites')
            .update({ is_tracking_enabled })
            .eq('id', siteId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('[ToggleTracking] Error:', error);
            return NextResponse.json({ error: 'Failed to update tracking status' }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Site not found or not authorized' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            is_tracking_enabled: data.is_tracking_enabled
        });

    } catch (error: unknown) {
        console.error('[ToggleTracking] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
