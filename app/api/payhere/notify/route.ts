/**
 * API Route: PayHere Webhook Notification Handler
 * POST /api/payhere/notify
 * 
 * Handles PayHere payment notifications for subscription payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-admin'; // Use service role
import { verifyPayHereNotification } from '@/lib/payhere/hash';
import { PAYHERE_STATUS_CODES } from '@/lib/payhere/types';

export async function POST(req: NextRequest) {
    try {
        // Parse form data from PayHere
        const formData = await req.formData();

        const notification = {
            merchant_id: formData.get('merchant_id') as string,
            order_id: formData.get('order_id') as string,
            payment_id: formData.get('payment_id') as string,
            subscription_id: formData.get('subscription_id') as string,
            payhere_amount: formData.get('payhere_amount') as string,
            payhere_currency: formData.get('payhere_currency') as string,
            status_code: formData.get('status_code') as string,
            md5sig: formData.get('md5sig') as string,
            custom_1: formData.get('custom_1') as string, // user_id
            custom_2: formData.get('custom_2') as string, // plan_id
            method: formData.get('method') as string,
            card_holder_name: formData.get('card_holder_name') as string,
            card_no: formData.get('card_no') as string,
        };

        console.log('[PayHere Webhook] Received notification:', {
            order_id: notification.order_id,
            status_code: notification.status_code,
            amount: notification.payhere_amount,
        });

        // Verify signature
        const isValid = verifyPayHereNotification(
            notification.merchant_id,
            notification.order_id,
            notification.payhere_amount,
            notification.payhere_currency,
            notification.status_code,
            notification.md5sig,
            process.env.PAYHERE_MERCHANT_SECRET!
        );

        if (!isValid) {
            console.error('[PayHere Webhook] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        // Initialize Supabase with service role (bypass RLS)
        const supabase = createClient();

        const userId = notification.custom_1;
        const planId = notification.custom_2;
        const statusMeaning = PAYHERE_STATUS_CODES[notification.status_code] || 'Unknown';

        // Parse amount
        const amount = parseFloat(notification.payhere_amount);

        // Handle payment based on status code
        if (notification.status_code === '2') {
            // Success - Activate subscription
            console.log('[PayHere Webhook] Payment successful, activating subscription');

            // CRITICAL FIX: Cancel any EXISTING active subscriptions to prevent multiple active plans
            await supabase
                .from('subscriptions')
                .update({ status: 'cancelled' })
                .eq('user_id', userId)
                .eq('status', 'active');

            // Find existing pending subscription or create new one
            const { data: existingSubscription } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', userId)
                .eq('plan_id', planId)
                .eq('status', 'pending')
                .single();

            if (existingSubscription) {
                // Update existing subscription
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        payhere_subscription_id: notification.subscription_id,
                        current_period_start: new Date().toISOString(),
                        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingSubscription.id);

                // Update profile with subscription link
                await supabase
                    .from('profiles')
                    .update({ subscription_id: existingSubscription.id })
                    .eq('user_id', userId);

            } else {
                // Create new subscription
                const { data: newSubscription } = await supabase
                    .from('subscriptions')
                    .insert({
                        user_id: userId,
                        plan_id: planId,
                        payhere_subscription_id: notification.subscription_id,
                        status: 'active',
                        start_date: new Date().toISOString(),
                        current_period_start: new Date().toISOString(),
                        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    })
                    .select('id')
                    .single();

                if (newSubscription) {
                    // Update profile
                    await supabase
                        .from('profiles')
                        .update({ subscription_id: newSubscription.id })
                        .eq('user_id', userId);
                }
            }

            // Record payment in history
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', userId)
                .eq('status', 'active')
                .single();

            if (subscription) {
                await supabase
                    .from('payment_history')
                    .insert({
                        subscription_id: subscription.id,
                        payhere_payment_id: notification.payment_id,
                        payhere_order_id: notification.order_id,
                        amount,
                        currency: notification.payhere_currency,
                        status: 'success',
                        metadata: {
                            method: notification.method,
                            card_holder_name: notification.card_holder_name,
                            card_no: notification.card_no,
                        },
                    });
            }

            // TODO: Send confirmation email to user

        } else if (['0'].includes(notification.status_code)) {
            // Pending
            console.log('[PayHere Webhook] Payment pending');

            // Record as pending payment
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', userId)
                .eq('plan_id', planId)
                .single();

            if (subscription) {
                await supabase
                    .from('payment_history')
                    .insert({
                        subscription_id: subscription.id,
                        payhere_payment_id: notification.payment_id,
                        payhere_order_id: notification.order_id,
                        amount,
                        currency: notification.payhere_currency,
                        status: 'pending',
                    });
            }

        } else {
            // Failed, Cancelled, or Chargedback
            console.log('[PayHere Webhook] Payment failed:', statusMeaning);

            // Record failed payment
            const { data: subscription } = await supabase
                .from('subscriptions')
                .select('id, status')
                .eq('user_id', userId)
                .eq('plan_id', planId)
                .single();

            if (subscription) {
                await supabase
                    .from('payment_history')
                    .insert({
                        subscription_id: subscription.id,
                        payhere_payment_id: notification.payment_id,
                        payhere_order_id: notification.order_id,
                        amount,
                        currency: notification.payhere_currency,
                        status: 'failed',
                        metadata: { reason: statusMeaning },
                    });

                // Mark subscription as failed if it was pending
                if (subscription.status === 'pending') {
                    await supabase
                        .from('subscriptions')
                        .update({ status: 'failed' })
                        .eq('id', subscription.id);
                }
            }

            // TODO: Send failed payment email to user
        }

        // Return 200 to acknowledge receipt
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[PayHere Webhook] Error processing notification:', error);
        // Still return 200 to prevent PayHere from retrying
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 200 });
    }
}
