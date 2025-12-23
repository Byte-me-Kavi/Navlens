
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
);

async function inspect() {
    const subId = '849d276d-f1b6-4c9c-9610-ae6c9d7df119';
    console.log(`Inspecting Sub: ${subId}`);

    // Get the raw row
    const { data: sub, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subId)
        .single();
    
    if (error) {
        console.error('Error fetching sub:', error);
        return;
    }

    console.log('--- RAW DATA ---');
    console.log('User ID:', sub.user_id);
    console.log('Plan ID:', sub.plan_id, typeof sub.plan_id);
    console.log('Status:', sub.status);
    
    // Check if we can fetch by plan_id as string
    console.log('\n--- TYPE CHECK ---');
    const { error: typeCheckError } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('plan_id', 'random-text-string') // deliberate text
        .limit(1);
    
    if (typeCheckError) {
        console.log('Query with text plan_id failed:', typeCheckError.message);
    } else {
        console.log('Query with text plan_id SUCCEEDED (Column is likely TEXT)');
    }
}

inspect();
