/**
 * API Route: Initiate PayHere Subscription
 * POST /api/payhere/initiate-subscription
 * 
 * Generates PayHere payment form HTML for subscription checkout
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { PayHereClient } from '@/lib/payhere/client';

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
        const { planId, currency = 'USD' } = body;

        if (!planId) {
            return NextResponse.json(
                { error: 'Plan ID is required' },
                { status: 400 }
            );
        }

        // Validate currency
        if (!['USD', 'LKR'].includes(currency)) {
            return NextResponse.json(
                { error: 'Invalid currency. Must be USD or LKR' },
                { status: 400 }
            );
        }

        // Fetch subscription plan details (try by ID first, then by name)
        let plan = null;
        let planError = null;

        // Try to find by ID first (for database UUIDs)
        const { data: planById, error: errorById } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .single();

        if (planById) {
            plan = planById;
        } else {
            // If not found by ID, try by name (for fallback IDs like 'starter-fallback')
            // Extract plan name from fallback ID (e.g., 'starter-fallback' -> 'Starter')
            const planName = planId.includes('-fallback')
                ? planId.replace('-fallback', '').charAt(0).toUpperCase() + planId.replace('-fallback', '').slice(1)
                : planId;

            const { data: planByName, error: errorByName } = await supabase
                .from('subscription_plans')
                .select('*')
                .ilike('name', planName)
                .single();

            if (planByName) {
                plan = planByName;
            } else {
                planError = errorByName;
            }
        }

        if (planError || !plan) {
            return NextResponse.json(
                { error: 'Subscription plan not found', details: planError },
                { status: 404 }
            );
        }

        // Don't allow payment for Free plan
        if (plan.name === 'Free') {
            return NextResponse.json(
                { error: 'Free plan does not require payment' },
                { status: 400 }
            );
        }

        // SECURITY: Check for existing active subscription
        const { data: activeSubscription } = await supabase
            .from('subscriptions')
            .select('id, plan_id, subscription_plans(name)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

        if (activeSubscription) {
            // Handle the relation which could be array or single object
            const plans = activeSubscription.subscription_plans;
            const currentPlan = Array.isArray(plans) ? plans[0] : plans;
            const currentPlanName = currentPlan?.name || 'Unknown';

            // Define plan tier hierarchy
            const planTier: Record<string, number> = {
                'Free': 0,
                'Starter': 1,
                'Pro': 2,
                'Enterprise': 3,
            };
            const currentTier = planTier[currentPlanName] ?? 0;
            const targetTier = planTier[plan.name] ?? 0;

            if (activeSubscription.plan_id === plan.id) {
                // Same plan - user already subscribed
                console.log('[Initiate Subscription] User already has this plan:', currentPlanName);
                return NextResponse.json({
                    error: 'Already subscribed',
                    message: `You already have an active ${currentPlanName} subscription.`,
                    currentPlan: currentPlanName,
                }, { status: 409 });
            } else if (targetTier <= currentTier) {
                // Downgrade or same tier - not allowed
                console.log('[Initiate Subscription] Downgrade not allowed from', currentPlanName, 'to', plan.name);
                return NextResponse.json({
                    error: 'Downgrade not allowed',
                    message: `You cannot downgrade from ${currentPlanName} to ${plan.name}. Please contact support if you need to change your plan.`,
                    currentPlan: currentPlanName,
                }, { status: 409 });
            }
            // If we get here, it's an upgrade - allow it to proceed
            console.log('[Initiate Subscription] Upgrade allowed from', currentPlanName, 'to', plan.name);
        }

        // CLEANUP: Remove any old pending subscriptions for this user
        const { error: cleanupError } = await supabase
            .from('subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('status', 'pending');

        if (cleanupError) {
            console.warn('[Initiate Subscription] Failed to cleanup pending subscriptions:', cleanupError);
            // Continue anyway - not critical
        }

        // Fetch user profile for customer details
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, company_name')
            .eq('user_id', user.id)
            .single();

        // Parse full name
        const fullName = profile?.full_name || user.email?.split('@')[0] || 'User';
        const [firstName, ...lastNameParts] = fullName.split(' ');
        const lastName = lastNameParts.join(' ') || firstName;

        // Initialize PayHere client
        const payhereClient = new PayHereClient();

        // Get base URL from request
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
            `${req.nextUrl.protocol}//${req.nextUrl.host}`;

        // Create payment request
        const paymentRequest = payhereClient.createSubscriptionPaymentRequest(
            plan.name,
            plan.price_usd,
            plan.price_lkr,
            currency,
            user.id,
            plan.id,
            {
                firstName,
                lastName,
                email: user.email!,
                phone: profile?.phone || '0000000000',
                address: 'N/A',
                city: 'Colombo',
                country: 'Sri Lanka',
            },
            baseUrl
        );

        // Log payment request for debugging
        console.log('💳 PayHere Payment Request:', {
            orderId: paymentRequest.orderId,
            amount: paymentRequest.amount,
            currency: paymentRequest.currency,
            recurrence: paymentRequest.recurrence,
            duration: paymentRequest.duration,
            customer: paymentRequest.customer,
        });

        // Generate payment form HTML
        const formHtml = payhereClient.createRecurringPaymentForm(paymentRequest);

        // Store pending subscription in database
        // Use plan.id (actual UUID) instead of planId (which might be fallback string)
        const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .insert({
                user_id: user.id,
                plan_id: plan.id,  // Use actual plan UUID from database
                status: 'pending',
                start_date: new Date().toISOString(),
            });

        if (subscriptionError) {
            console.error('Failed to create pending subscription:', subscriptionError);
            // Continue anyway - webhook will handle subscription creation
        }

        return NextResponse.json({
            success: true,
            formHtml,
            orderId: paymentRequest.orderId,
        });

    } catch (error) {
        console.error('PayHere initiate subscription error:', error);
        return NextResponse.json(
            { error: 'Failed to initiate payment' },
            { status: 500 }
        );
    }
}
