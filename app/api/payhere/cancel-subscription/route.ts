/**
 * API Route: Cancel Subscription
 * POST /api/payhere/cancel-subscription
 * 
 * Allows users to cancel their subscription (at period end or immediately)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/lib/supabase/server-admin';
import { createClient as createUserClient } from '@/lib/supabase/server';
import { sendSubscriptionCancelledEmail } from '@/lib/email/service';

export async function POST(req: NextRequest) {
    try {
        const supabaseUser = await createUserClient();
        const supabaseAdmin = createAdminClient();

        // Check authentication (User Client)
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await req.json();
        const { subscriptionId, immediate = false } = body;

        if (!subscriptionId) {
            return NextResponse.json(
                { error: 'Subscription ID is required' },
                { status: 400 }
            );
        }

        // Verify user owns this subscription
        const { data: subscription, error: fetchError } = await supabaseUser
            .from('subscriptions')
            .select('*')
            .eq('id', subscriptionId)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !subscription) {
            return NextResponse.json(
                { error: 'Subscription not found' },
                { status: 404 }
            );
        }

        if (subscription.status !== 'active') {
            return NextResponse.json(
                { error: 'Subscription is not active' },
                { status: 400 }
            );
        }

        // Update subscription
        if (immediate) {
            // Cancel immediately
            const { error: updateError } = await supabaseAdmin
                .from('subscriptions')
                .update({
                    status: 'cancelled',
                    end_date: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', subscriptionId);

            if (updateError) {
                throw updateError;
            }

            // Remove from profile
            await supabaseAdmin
                .from('profiles')
                .update({ subscription_id: null })
                .eq('user_id', user.id);

        } else {
            // Cancel at period end
            const { error: updateError } = await supabaseAdmin
                .from('subscriptions')
                .update({
                    cancel_at_period_end: true,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', subscriptionId);

            if (updateError) {
                throw updateError;
            }
        }

        // Send cancellation email
        if (user.email) {
            // Run in background to not block response
            sendSubscriptionCancelledEmail(user.email).catch(err =>
                console.error('Failed to send cancellation email:', err)
            );
        }

        // TODO: Call PayHere Subscription Manager API to cancel on their end
        // This requires setting up OAuth and API keys

        return NextResponse.json({
            success: true,
            immediate,
            message: immediate
                ? 'Subscription cancelled immediately'
                : 'Subscription will be cancelled at the end of the current period',
        });

    } catch (error) {
        console.error('Cancel subscription error:', error);
        return NextResponse.json(
            { error: 'Failed to cancel subscription' },
            { status: 500 }
        );
    }
}
