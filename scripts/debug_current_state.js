
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
);

async function inspect() {
    const userId = 'c4c0dc19-8e55-4bb7-8c34-25200ed01a23';
    console.log(`Inspecting User: ${userId}`);

    // 1. Check User Age
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    const createdAt = new Date(user.user.created_at);
    const now = new Date();
    const daysOld = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    console.log(`User Age: ${daysOld} days (Middleware triggers at > 30)`);
    let outputLog = `User Age: ${daysOld} days\n`;

    // 2. Fetch ALL Subscriptions
    const { data: subs } = await supabase
        .from('subscriptions')
        .select(`
            id, 
            status, 
            current_period_end, 
            plan_id
        `)
        .eq('user_id', userId);
        
    console.log(`\nFound ${subs.length} subscriptions:`);
    
    // 3. Fetch Plan Names for contexts
    for (const s of subs) {
        const { data: plan } = await supabase
            .from('subscription_plans')
            .select('name, price')
            .eq('id', s.plan_id)
            .single();
            
        console.log(`\n[Sub ID: ${s.id}]`);
        console.log(`   - Status: ${s.status}`);
        console.log(`   - Ends: ${s.current_period_end}`);
        console.log(`   - Plan ID: ${s.plan_id}`);
        console.log(`   - Plan Name: ${plan ? plan.name : 'UNKNOWN PLAN'}`);
        
        // Emulate Middleware Check
        const FREE_UUID = '34db65db-eec8-492a-b4a4-208ec912efa8';
        const isFree = s.plan_id === FREE_UUID;
        
        console.log(`   - Middleware sees as 'Paid'? ${!isFree}`);
        
        outputLog += `\n[Sub ID: ${s.id}]
   - Status: ${s.status}
   - Ends: ${s.current_period_end}
   - Plan ID: ${s.plan_id}
   - Plan Name: ${plan ? plan.name : 'UNKNOWN PLAN'}
   - Middleware sees as 'Paid'? ${!isFree}`;
    }
    
    require('fs').writeFileSync('scripts/debug_log_2.txt', outputLog);
}

inspect();
