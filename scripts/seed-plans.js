
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLANS = [
    {
        name: 'Free',
        description: 'For hobby sites',
        price_monthly: 0,
        limits: {
            sites: 1,
            events_per_month: 2000,
            features: ['basic_analytics', 'heatmaps_limited']
        }
    },
    {
        name: 'Pro',
        description: 'For growing businesses',
        price_monthly: 29,
        limits: {
            sites: 5,
            events_per_month: 50000,
            features: ['advanced_analytics', 'heatmaps_unlimited', 'export']
        }
    },
    {
        name: 'Enterprise',
        description: 'For large usage',
        price_monthly: 199,
        limits: {
            sites: 20,
            events_per_month: 1000000,
            features: ['all', 'priority_support']
        }
    }
];

async function seed() {
    console.log('Seeding plans...');
    for (const plan of PLANS) {
        // Check if exists
        const { data } = await supabase.from('subscription_plans').select('id').eq('name', plan.name).single();
        if (!data) {
            const { error } = await supabase.from('subscription_plans').insert(plan);
            if (error) console.error(`Failed to insert ${plan.name}:`, error.message);
            else console.log(`Inserted ${plan.name}`);
        } else {
            console.log(`Plan ${plan.name} already exists.`);
        }
    }
    console.log('Done.');
}

seed();
