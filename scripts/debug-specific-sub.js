
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
);

async function checkSub() {

    const userId = '13b53f66-9e67-4638-89c0-64259b6f1253'; // Need to find user ID first or query by known sub ID
    // actually, let's query the specific sub ID again but print cleaner to avoid truncation
    
    // First get user ID from the sub
    const { data: sub } = await supabase.from('subscriptions').select('user_id').eq('id', '849d276d-f1b6-4c9c-9610-ae6c9d7df119').single();
    if (!sub) { console.log('Sub not found'); return; }

    console.log(`User ID: ${sub.user_id}`);

    const { data: allSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', sub.user_id);

    console.log(`Found ${allSubs.length} subscriptions`);
    allSubs.forEach((s, i) => {
        console.log(`\n[${i}] ID: ${s.id}`);
        console.log(`    Plan: '${s.plan_id}'`);
        console.log(`    Status: '${s.status}'`);
        console.log(`    End: ${s.current_period_end}`);
    });
}
checkSub();
