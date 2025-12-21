
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-admin';
import { withMonitoring } from "@/lib/api-middleware";
import { logAdminAction } from "@/lib/admin-logger";

export const dynamic = 'force-dynamic';

async function POST_handler(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, planId } = body;

        if (!userId || !planId) {
            return NextResponse.json({ error: 'Missing userId or planId' }, { status: 400 });
        }

        const supabase = createClient();

        // Check if subscription exists - Get ALL to ensure consistency (Self-Healing)
        const { data: userSubs, error: fetchError } = await supabase
            .from('subscriptions')
            .select('id, status, created_at, plan_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('[AdminUpdatePlan] Fetch Error:', fetchError);
        }

        let targetSubId = null;
        let oldPlanId = null;

        if (userSubs && userSubs.length > 0) {
            // Filter implementation for strict single-active consistency
            const activeSubs = userSubs.filter(s => s.status === 'active' || s.status === 'trialing');

            if (activeSubs.length > 1) {
                console.warn(`[AdminUpdatePlan] User ${userId} has ${activeSubs.length} active subscriptions. Auto-fixing...`);
                // Keep newest, cancel others
                const toKeep = activeSubs[0];
                const toCancel = activeSubs.slice(1);

                await supabase.from('subscriptions')
                    .update({ status: 'canceled', cancel_at_period_end: false, canceled_at: new Date().toISOString() })
                    .in('id', toCancel.map(s => s.id));

                targetSubId = toKeep.id;
                oldPlanId = toKeep.plan_id;
            } else if (activeSubs.length === 1) {
                targetSubId = activeSubs[0].id;
                oldPlanId = activeSubs[0].plan_id;
            } else {
                // Reactivate newest inactive if possible, or just treat as new insert if we prefer.
                // For safety with Gift logic, let's reuse the newest record if it exists to keep ID stable.
                targetSubId = userSubs[0].id;
                oldPlanId = userSubs[0].plan_id;
            }
        }

        const existing = targetSubId ? { id: targetSubId } : null;

        if (existing) {
            // Update existing (Latest/Valid)
            console.log(`[AdminUpdatePlan] Updating subscription ${existing.id} for user ${userId}`);
            const { error: updateError } = await supabase
                .from('subscriptions')
                .update({
                    plan_id: planId,
                    status: 'active',
                    cancel_at_period_end: false,
                    canceled_at: null,
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                })
                .eq('id', existing.id);

            if (updateError) {
                console.error('[AdminUpdatePlan] Update Error:', updateError);
                throw updateError;
            }
        } else {
            // Insert new
            console.log(`[AdminUpdatePlan] Creating new subscription for user ${userId}`);
            const { error: insertError } = await supabase
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    plan_id: planId,
                    status: 'active',
                    current_period_start: new Date().toISOString(),
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    start_date: new Date().toISOString()
                });

            if (insertError) {
                console.error('[AdminUpdatePlan] Insert Error:', insertError);
                throw insertError;
            }

            // Get the ID of the inserted subscription for profile sync
            const { data: newSub } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (newSub) {
                await supabase.from('profiles').update({ subscription_id: newSub.id }).eq('user_id', userId);
                targetSubId = newSub.id;
            }
        }

        // Ensure profile is synced for updates too
        if (existing) {
            await supabase.from('profiles').update({ subscription_id: existing.id }).eq('user_id', userId);
        }

        // Fetch all plans to compare prices
        const { data: allPlans } = await supabase.from('subscription_plans').select('id, name, price_usd');
        const planMap = new Map(allPlans?.map(p => [p.id, p]));
        const newPlan = planMap.get(planId);

        let isUpgrade = true; // Default to upgrade (optimistic)
        if (oldPlanId && newPlan) {
            const oldPlan = planMap.get(oldPlanId);
            if (oldPlan) {
                // Tier Order Logic
                const tiers = ['Free', 'Starter', 'Pro', 'Enterprise'];

                // Helper to get index, defaulting to -1 if not found
                const getTierIndex = (name: string) => {
                    return tiers.findIndex(t => name.toLowerCase().includes(t.toLowerCase()));
                };

                const oldIndex = getTierIndex(oldPlan.name);
                const newIndex = getTierIndex(newPlan.name);

                console.log(`[AdminUpdatePlan] Compare: Old="${oldPlan.name}"(${oldIndex}) vs New="${newPlan.name}"(${newIndex})`);

                // If both are valid tiers, rely on order
                if (oldIndex !== -1 && newIndex !== -1) {
                    if (newIndex < oldIndex) {
                        console.log('[AdminUpdatePlan] Detected Downgrade (Index Check)');
                        isUpgrade = false;
                    } else {
                        console.log('[AdminUpdatePlan] Detected Upgrade/Same (Index Check)');
                    }
                } else {
                    // Fallback to price if names don't match known tiers
                    if ((newPlan.price_usd || 0) < (oldPlan.price_usd || 0)) {
                        console.log('[AdminUpdatePlan] Detected Downgrade (Price Check)');
                        isUpgrade = false;
                    }
                }
            }
        }

        // Add Notification
        try {
            console.log('[AdminUpdatePlan] Sending notification to', userId);

            const notifTitle = isUpgrade ? 'Plan Gifted! 🎉' : 'Plan Adjusted';
            const notifMessage = isUpgrade
                ? `An admin has gifted you an upgrade to the ${newPlan?.name || 'new'} plan. Enjoy!`
                : `Your subscription has been changed to the ${newPlan?.name || 'new'} plan by an administrator.`;
            const notifType = isUpgrade ? 'success' : 'info';

            const { error: notifError } = await supabase.from('notifications').insert({
                user_id: userId,
                title: notifTitle,
                message: notifMessage,
                type: notifType
            });
            if (notifError) {
                console.error('[AdminUpdatePlan] Notification Insert Failed:', notifError);
            } else {
                console.log('[AdminUpdatePlan] Notification Sent Successfully');
            }
        } catch (notifError) {
            console.error('[AdminUpdatePlan] Unexpected Notification Error:', notifError);
        }

        // Log this action
        await logAdminAction(request, {
            action: 'UPDATE_PLAN',
            targetResource: userId,
            details: { plan_id: planId }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[AdminUpdatePlan] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const POST = withMonitoring(POST_handler);
