/**
 * API Route: Confirm Subscription after PayHere success redirect
 * POST /api/payhere/confirm-subscription
 * 
 * This endpoint is called from the success page to activate a pending subscription
 * when the PayHere webhook hasn't been received (common in sandbox/localhost testing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { orderId } = body;

        console.log('[Confirm Subscription] Processing for user:', user.id, 'Order:', orderId);

        // Find the user's pending subscription
        const { data: pendingSubscription, error: findError } = await supabase
            .from('subscriptions')
            .select('id, plan_id, status')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (findError) {
            console.log('[Confirm Subscription] No pending subscription found:', findError);

            // Check if there's already an active subscription
            const { data: activeSubscription } = await supabase
                .from('subscriptions')
                .select('id, plan_id, subscription_plans(name)')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            if (activeSubscription) {
                console.log('[Confirm Subscription] User already has active subscription');
                return NextResponse.json({
                    success: true,
                    message: 'Subscription already active',
                    subscription: activeSubscription
                });
            }

            return NextResponse.json(
                { error: 'No pending subscription found' },
                { status: 404 }
            );
        }

        console.log('[Confirm Subscription] Found pending subscription:', pendingSubscription.id);

        // Activate the subscription
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
                status: 'active',
                current_period_start: now.toISOString(),
                current_period_end: periodEnd.toISOString(),
                updated_at: now.toISOString(),
            })
            .eq('id', pendingSubscription.id);

        if (updateError) {
            console.error('[Confirm Subscription] Failed to activate subscription:', updateError);
            return NextResponse.json(
                { error: 'Failed to activate subscription' },
                { status: 500 }
            );
        }

        // Update the user's profile to link to this subscription
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ subscription_id: pendingSubscription.id })
            .eq('user_id', user.id);

        if (profileError) {
            console.error('[Confirm Subscription] Failed to update profile:', profileError);
            // Don't fail - subscription is already active
        }

        // Fetch the updated subscription with plan details
        const { data: activatedSubscription } = await supabase
            .from('subscriptions')
            .select('id, plan_id, status, subscription_plans(name, price_usd)')
            .eq('id', pendingSubscription.id)
            .single();

        console.log('[Confirm Subscription] Successfully activated:', activatedSubscription);

        return NextResponse.json({
            success: true,
            message: 'Subscription activated',
            subscription: activatedSubscription
        });

    } catch (error) {
        console.error('[Confirm Subscription] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
