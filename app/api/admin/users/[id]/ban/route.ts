import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server-admin';
import { logAdminAction } from '@/lib/admin-logger';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Security Check
        const cookieStore = await cookies();
        const adminSession = cookieStore.get('admin_session');
        if (!adminSession?.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Params & Body
        // Await params for Next.js 15+
        const resolvedParams = await params;
        const userId = resolvedParams.id;
        const { action } = await request.json(); // action: '24h', '7d', 'forever', 'unban'

        if (!userId || !action) {
            return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
        }

        // 3. Determine Ban Duration
        let banDuration = 'none';

        // Calculate ban duration string for Supabase
        // Supabase accepts `ban_duration` in format: "100h", "20m" etc.
        switch (action) {
            case '24h':
                banDuration = '24h';
                break;
            case '7d':
                banDuration = '168h';
                break;
            case 'forever':
                banDuration = '876000h'; // ~100 years
                break;
            case 'unban':
                banDuration = 'none';
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // 4. Update User via Supabase Admin
        const supabase = createClient();
        const { data, error } = await supabase.auth.admin.updateUserById(userId, {
            ban_duration: banDuration
        });

        if (error) {
            console.error('[AdminBan] Failed:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 5. Audit Log
        await logAdminAction(request, {
            action: action === 'unban' ? 'UNBAN_USER' : 'BAN_USER',
            targetResource: userId,
            details: { ban_duration: banDuration, request_action: action }
        });

        const userWithType = data.user as any;
        return NextResponse.json({
            success: true,
            user: {
                id: userWithType.id,
                banned_until: userWithType.banned_until
            }
        });

    } catch (error: any) {
        console.error('[AdminBan] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
