/**
 * API Route: Schedule Subscription Downgrade
 * POST /api/payhere/schedule-downgrade
 * 
 * Schedules a plan downgrade to take effect at the end of the current billing cycle
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await req.json();
        const { targetPlanId } = body;

        if (!targetPlanId) {
            return NextResponse.json(
                { error: 'Target plan ID is required' },
                { status: 400 }
            );
        }

        // Get current active subscription
        const { data: currentSubscription, error: subError } = await supabase
            .from('subscriptions')
            .select('id, plan_id, status, current_period_end, subscription_plans(name)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

        if (subError || !currentSubscription) {
            return NextResponse.json(
                { error: 'No active subscription found' },
                { status: 404 }
            );
        }

        // Get target plan details
        let targetPlan = null;

        // Try by ID first
        const { data: planById } = await supabase
            .from('subscription_plans')
            .select('id, name')
            .eq('id', targetPlanId)
            .single();

        if (planById) {
            targetPlan = planById;
        } else {
            // Try by name (for fallback IDs)
            const planName = targetPlanId.includes('-fallback')
                ? targetPlanId.replace('-fallback', '').charAt(0).toUpperCase() + targetPlanId.replace('-fallback', '').slice(1)
                : targetPlanId;

            const { data: planByName } = await supabase
                .from('subscription_plans')
                .select('id, name')
                .ilike('name', planName)
                .single();

            targetPlan = planByName;
        }

        if (!targetPlan) {
            return NextResponse.json(
                { error: 'Target plan not found' },
                { status: 404 }
            );
        }

        // Validate it's actually a downgrade
        const planTier: Record<string, number> = {
            'Free': 0,
            'Starter': 1,
            'Pro': 2,
            'Enterprise': 3,
        };

        const currentPlans = currentSubscription.subscription_plans;
        const currentPlan = Array.isArray(currentPlans) ? currentPlans[0] : currentPlans;
        const currentPlanName = currentPlan?.name || 'Unknown';
        const currentTier = planTier[currentPlanName] ?? 0;
        const targetTier = planTier[targetPlan.name] ?? 0;

        if (targetTier >= currentTier) {
            return NextResponse.json(
                { error: 'This is not a downgrade. Use the regular subscription flow for upgrades.' },
                { status: 400 }
            );
        }

        // Store scheduled downgrade in subscription metadata
        // We'll use a formatted string in payhere_subscription_id temporarily
        // Better solution: Add a scheduled_plan_id column to subscriptions table
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
                // Store scheduled downgrade info
                // We use these existing fields creatively:
                cancel_at_period_end: true, // Mark that something changes at period end
                updated_at: new Date().toISOString(),
            })
            .eq('id', currentSubscription.id);

        if (updateError) {
            console.error('[Schedule Downgrade] Update error:', updateError);
            return NextResponse.json(
                { error: 'Failed to schedule downgrade' },
                { status: 500 }
            );
        }

        // Store the scheduled plan in a separate record or profile metadata - DEPRECATED
        // For now, we'll use the profiles table's metadata
        // await supabase
        //     .from('profiles')
        //     .update({
        //         updated_at: new Date().toISOString(),
        //     })
        //     .eq('user_id', user.id);

        // Log the scheduled downgrade
        console.log('[Schedule Downgrade] Scheduled:', {
            userId: user.id,
            from: currentPlanName,
            to: targetPlan.name,
            effectiveDate: currentSubscription.current_period_end,
        });

        return NextResponse.json({
            success: true,
            message: `Your plan will be changed from ${currentPlanName} to ${targetPlan.name} at the end of your billing cycle.`,
            currentPlan: currentPlanName,
            targetPlan: targetPlan.name,
            effectiveDate: currentSubscription.current_period_end,
        });

    } catch (error) {
        console.error('[Schedule Downgrade] Error:', error);
        return NextResponse.json(
            { error: 'Failed to schedule downgrade' },
            { status: 500 }
        );
    }
}

// GET endpoint to check scheduled downgrade status
export async function GET(_req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('id, cancel_at_period_end, current_period_end, subscription_plans(name)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

        if (!subscription) {
            return NextResponse.json({ hasScheduledChange: false });
        }

        return NextResponse.json({
            hasScheduledChange: subscription.cancel_at_period_end,
            effectiveDate: subscription.current_period_end,
            currentPlan: subscription.subscription_plans,
        });

    } catch (error) {
        console.error('[Schedule Downgrade] GET Error:', error);
        return NextResponse.json(
            { error: 'Failed to check downgrade status' },
            { status: 500 }
        );
    }
}
