/**
 * Fix Subscription Script
 * Updates a user's subscription to the correct plan
 * 
 * Usage: node scripts/fix-subscription.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration - Update these values
const USER_EMAIL = 'kaveeshatrishan3176@gmail.com';
const TARGET_PLAN_NAME = 'Pro'; // The plan they should be on
const ORDER_ID = 'SUB-c4c0dc19-1766490152213-911';

async function fixSubscription() {
    console.log('🔧 Starting subscription fix...\n');

    try {
        // 1. Get the Pro plan ID
        const { data: plan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('name', TARGET_PLAN_NAME)
            .single();

        if (planError || !plan) {
            console.error('❌ Could not find plan:', TARGET_PLAN_NAME);
            console.error(planError);
            return;
        }

        console.log(`✅ Found ${plan.name} plan: ${plan.id} ($${plan.price_usd || plan.price || 0}/mo)`);

        // 2. Get user by email
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
        if (userError) throw userError;

        const user = userData.users.find(u => u.email === USER_EMAIL);
        if (!user) {
            console.error('❌ Could not find user:', USER_EMAIL);
            return;
        }

        console.log(`✅ Found user: ${user.email} (${user.id})`);

        // 3. Find their current subscription
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*, subscription_plans(name)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (subError) {
            console.error('❌ Could not find subscription for user');
            console.error(subError);
            return;
        }

        console.log(`📦 Current subscription: ${subscription.subscription_plans?.name || 'Unknown'} (${subscription.id})`);

        // 4. Update subscription to Pro plan
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
                plan_id: plan.id,
                status: 'active', // Force active status
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
                updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id);

        if (updateError) {
            console.error('❌ Failed to update subscription');
            console.error(updateError);
            return;
        }

        console.log(`\n🎉 SUCCESS! Subscription updated to ${TARGET_PLAN_NAME} plan`);

        // 5. Also update profile's subscription_id if needed
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ subscription_id: subscription.id })
            .eq('user_id', user.id);

        if (!profileError) {
            console.log('✅ Profile linked to subscription');
        }

        // 6. Add a payment history record
        const { error: paymentError } = await supabase
            .from('payment_history')
            .insert({
                subscription_id: subscription.id,
                amount: plan.price_monthly,
                currency: 'USD',
                status: 'success',
                payment_date: new Date().toISOString(),
                payhere_order_id: ORDER_ID,
                metadata: { 
                    note: 'Manual fix - sandbox payment',
                    fixed_at: new Date().toISOString()
                }
            });

        if (!paymentError) {
            console.log('✅ Payment history record created');
        } else {
            console.log('⚠️ Could not create payment history:', paymentError.message);
        }

        console.log('\n📋 Summary:');
        console.log(`   User: ${USER_EMAIL}`);
        console.log(`   Plan: ${TARGET_PLAN_NAME}`);
        console.log(`   Subscription ID: ${subscription.id}`);
        console.log('\n✨ Done! The user should now see Pro features.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixSubscription();
