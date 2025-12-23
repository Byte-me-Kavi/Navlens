
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const USER_EMAIL = 'kaveeshatrishan3176@gmail.com';

async function forceCancel() {
    console.log('🔧 Forcing cancellation status...\n');

    try {
        // 1. Get user
        const { data: userData } = await supabase.auth.admin.listUsers();
        const user = userData.users.find(u => u.email === USER_EMAIL);
        
        if (!user) {
            console.log('User not found');
            return;
        }

        // 2. Get subscription
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!sub) {
            console.log('No subscription found');
            return;
        }

        // 3. Update
        const { error } = await supabase
            .from('subscriptions')
            .update({
                cancel_at_period_end: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

        if (error) {
            console.error('Error updating:', error);
        } else {
            console.log('✅ Success! cancel_at_period_end set to TRUE.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

forceCancel();
