import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-admin';
import { sendSubscriptionExpiringEmail } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Optional: Add a secret key check for security
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 });
    // }

    try {
        const supabase = createClient();

        // Calculate date range: 3 days from now
        const today = new Date();
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + 3); // Check for expiration in 3 days
        
        // Start of target day
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        // End of target day
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`[Cron] Checking for subscriptions expiring between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

        const { data: expiringSubs, error } = await supabase
            .from('subscriptions')
            .select(`
                id,
                user_id,
                current_period_end,
                subscription_plans (name)
            `)
            .eq('status', 'active')
            .gte('current_period_end', startOfDay.toISOString())
            .lte('current_period_end', endOfDay.toISOString());

        if (error) throw error;

        console.log(`[Cron] Found ${expiringSubs?.length || 0} expiring subscriptions.`);

        if (!expiringSubs || expiringSubs.length === 0) {
            return NextResponse.json({ processed: 0, message: 'No expiring subscriptions found.' });
        }

        let sentCount = 0;
        const errors = [];

        for (const sub of expiringSubs) {
            try {
                // Get user email
                const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(sub.user_id);
                
                if (userError || !user?.email) {
                    console.error(`[Cron] User not found for sub ${sub.id}`);
                    continue;
                }

                // Get plan name
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const plans: any = sub.subscription_plans;
                const planName = Array.isArray(plans) 
                    ? plans[0]?.name 
                    : plans?.name || 'Premium';

                // Calculate exact days left (should be around 3)
                const daysLeft = Math.ceil((new Date(sub.current_period_end).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                // Link to billing
                const renewLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account?tab=billing`;

                await sendSubscriptionExpiringEmail(user.email, planName, daysLeft, renewLink);
                sentCount++;
                console.log(`[Cron] Reminder sent to ${user.email} for sub ${sub.id}`);

            } catch (err) {
                console.error(`[Cron] Failed to process sub ${sub.id}:`, err);
                errors.push({ id: sub.id, error: err });
            }
        }

        return NextResponse.json({
            success: true,
            processed: sentCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('[Cron] Error checking expiries:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
