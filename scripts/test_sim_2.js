
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
);

async function run() {
    const userId = 'c4c0dc19-8e55-4bb7-8c34-25200ed01a23';
    const FREE_PLAN_ID = '34db65db-eec8-492a-b4a4-208ec912efa8';

    console.log("--- STARTING TEST ---");

    // Fetch ALL subscriptions for the user
    const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('id, status, plan_id, cancel_at_period_end, current_period_end')
        .eq('user_id', userId)
        .order('current_period_end', { ascending: false });
    
    if (error) {
        console.error("QUERY ERROR:", error);
        return;
    }

    console.log(`Found ${subscriptions.length} subs`);
    
    // Manual JS Filter to debug why database filter might fail
    const paidSubs = subscriptions.filter(s => s.plan_id !== FREE_PLAN_ID);
    console.log(`Paid Subs (JS Filter): ${paidSubs.length}`);

    if (paidSubs.length === 0) {
        console.log("No paid subs found. Dumping all:");
        subscriptions.forEach(s => console.log(JSON.stringify(s)));
        console.log("FREE PLAN ID TARGET:", FREE_PLAN_ID);
        console.log("RESULT: BLOCKED");
        return;
    } 
    
    // Select the best candidate (top one)
    const subscription = paidSubs[0]; 
    console.log("Selected Sub:", subscription);
    
    // Check access logic
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const isActiveStatus = ['active', 'trialing'].includes(subscription.status);
    const isWithinPeriod = periodEnd > now;

    const logOutput = `
--- LOGIC DEBUG ---
Sub ID: ${subscription.id}
Sub Status: '${subscription.status}'
Is Active Status? ${isActiveStatus}
Current Period End (DB): '${subscription.current_period_end}'
Current Period End (Obj): ${periodEnd.toString()}
Now (Server): ${now.toString()}
Comparison: ${periodEnd.getTime()} > ${now.getTime()}? ${isWithinPeriod}
RESULT: ${isActiveStatus || isWithinPeriod ? 'ALLOWED' : 'BLOCKED'}
    `;

    console.log(logOutput);
    require('fs').writeFileSync('scripts/debug_log.txt', logOutput);
}

run();
