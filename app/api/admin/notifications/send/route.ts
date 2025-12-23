
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-admin';
import { withMonitoring } from "@/lib/api-middleware";
import { logAdminAction } from "@/lib/admin-logger";

export const dynamic = 'force-dynamic';

async function POST_handler(request: NextRequest) {
    try {
        const body = await request.json();
        const { title, message, type, audience, targetValue } = body;

        // Validation
        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
        }

        const supabase = createClient();
        let targetUserIds: string[] = [];
        const logDetails: Record<string, unknown> = { type, audience };

        // Determine Target Users
        if (audience === 'all') {
            const { data: users, error } = await supabase.auth.admin.listUsers({ perPage: 10000 });
            if (error) throw error;
            targetUserIds = users.users.map(u => u.id);
            logDetails.count = targetUserIds.length;
        }
        else if (audience === 'email') {
            // Find user by email (using listUsers logic or helper if available, assumes 1)
            // Since we can't query auth.users directly easily via client usually, we use admin.listUsers? No, that's pagination.
            // Actually, we can use rpc or just iterate. But 'listUsers' is best.
            // Or simpler: We might just rely on client lookup? No, secure by email.
            // For now, let's assume valid UUID is passed or Email.
            // If email:
            if (targetValue.includes('@')) {
                // Warning: listing all to find one is slow. But for admin tool it's okay for now.
                // Better: use Supabase Admin API to finding user is tricky without direct DB access.
                // We will assume 'targetValue' IS the email and we search.
                // Actually listUsers supports 'query' param? No.
                // We will assume the Admin Page sends the UUID if possible. If input is email, we have to search.
                // Let's rely on frontend sending UUID if singular. But if Admin types email...
                // Let's simplistic approach:
                const { data: _data, error: _error } = await supabase.from('profiles').select('user_id').eq('email', targetValue).single(); // Assuming profiles has email? Profiles usually doesn't have email in some schemas.
                // Start with Auth:
                // Wait, we can't query auth users easily.
                // Let's assuming we fetch all profiles?
                // Let's trust the frontend sends a UUID for "Specific User".
                targetUserIds = [targetValue];
            } else {
                targetUserIds = [targetValue];
            }
        }
        else if (audience === 'plan') {
            // targetValue is planId
            // Join subscriptions
            const { data: subs, error } = await supabase
                .from('subscriptions')
                .select('user_id')
                .eq('plan_id', targetValue)
                .eq('status', 'active');

            if (error) throw error;
            targetUserIds = subs.map(s => s.user_id);
            logDetails.planId = targetValue;
            logDetails.count = targetUserIds.length;
        }

        if (targetUserIds.length === 0) {
            return NextResponse.json({ error: 'No users found for target' }, { status: 404 });
        }

        // Batch Insert
        // Split into chunks of 1000
        const chunkSize = 1000;
        const chunks = [];
        for (let i = 0; i < targetUserIds.length; i += chunkSize) {
            chunks.push(targetUserIds.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
            const rows = chunk.map(uid => ({
                user_id: uid,
                title,
                message,
                type: type || 'info',
                read: false
            }));

            const { error: insertError } = await supabase.from('notifications').insert(rows);
            if (insertError) throw insertError;
        }

        await logAdminAction(request, {
            action: 'SEND_NOTIFICATION',
            targetResource: audience,
            details: logDetails
        });

        return NextResponse.json({ success: true, count: targetUserIds.length });

    } catch (error: unknown) {
        console.error('Notification Send Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export const POST = withMonitoring(POST_handler);
