
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
);

async function simulateMiddleware() {
    const userId = '13b53f66-9e67-4638-89c0-64259b6f1253';
    console.log(`Simulating middleware for User: ${userId}`);

    // EXACT query from proxy.ts
    const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('id, status, plan_id, cancel_at_period_end, current_period_end')
        .eq('user_id', userId)
        .neq('plan_id', '34db65db-eec8-492a-b4a4-208ec912efa8') 
        .order('current_period_end', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Query Error:', error);
    } else {
        console.log('Query Result:', subscription);
    }

    let hasActivePaidSub = false;

    if (subscription) {
        const now = new Date();
        const periodEnd = new Date(subscription.current_period_end);
        
        console.log(`[MW] Found sub: ${subscription.id} | Plan: ${subscription.plan_id} | Status: ${subscription.status} | Ends: ${subscription.current_period_end}`);

        const isActiveStatus = ['active', 'trialing'].includes(subscription.status);
        const isWithinPeriod = periodEnd > now;
        
        console.log(`[MW] Check: ActiveStatus=${isActiveStatus}, WithinPeriod=${isWithinPeriod} (${periodEnd.toISOString()} > ${now.toISOString()})`);

        if (isActiveStatus || isWithinPeriod) {
            hasActivePaidSub = true;
        }
    } else {
         console.log('[MW] No paid subscription found');
    }

    console.log(`FINAL RESULT: hasActivePaidSub = ${hasActivePaidSub}`);
    console.log(`Outcome: ${hasActivePaidSub ? 'ALLOWED' : 'BLOCKED'}`);
}

simulateMiddleware();
