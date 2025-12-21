
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPlans() {
    const { data, error } = await supabase
        .from('subscription_plans')
        .select('*');

    if (error) {
        console.error('Error fetching plans:', error);
    } else {
        console.log('Plans found:', data);
        if (data.length === 0) {
            console.log('Table is empty! Seeding required.');
        }
    }
}

checkPlans();
