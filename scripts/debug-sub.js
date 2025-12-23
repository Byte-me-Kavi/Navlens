
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const USER_EMAIL = 'kaveeshatrishan3176@gmail.com';

async function checkSubscription() {
    console.log('🔍 Checking subscription state...\n');

    try {
        // 1. Get user
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
        const user = userData.users.find(u => u.email === USER_EMAIL);
        
        if (!user) {
            console.log('User not found');
            return;
        }

        // 2. Get subscription
        const { data: sub, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error(error);
            return;
        }

        console.log('Subscription Data:');
        console.log({
            id: sub.id,
            status: sub.status,
            plan_id: sub.plan_id,
            cancel_at_period_end: sub.cancel_at_period_end, // This is the key field
            current_period_end: sub.current_period_end,
            updated_at: sub.updated_at
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

checkSubscription();
