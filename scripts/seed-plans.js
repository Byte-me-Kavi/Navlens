
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLANS = [
  {
    name: 'Free',
    description: 'Prove the value. For students & hobbyists.',
    price_monthly: 0,
    limits: {
      sessions: 1000,
      recordings: 100,
      retention_days: 3,
      events_per_month: 1000,
      active_experiments: 0,
      active_surveys: 0,
      features: [
        'click_heatmaps',
        'scroll_heatmaps',
        'live_user_view',
        'session_recording',
        'skip_inactivity',
        'privacy_center'
      ]
    }
  },
  {
    name: 'Starter',
    description: 'See clear behavior. For solopreneurs.',
    price_monthly: 29,
    limits: {
      sessions: 5000,
      recordings: 1000,
      retention_days: 30,
      events_per_month: 10000,
      active_experiments: 1,
      active_surveys: 1,
      features: [
        'click_heatmaps', 'scroll_heatmaps', 'live_user_view', 'session_recording', 'skip_inactivity', 'privacy_center',
        // Unlocked
        'feedback_widget',
        'hover_heatmaps',
        'frustration_signals',
        'ab_testing',
        'surveys'
      ]
    }
  },
  {
    name: 'Pro',
    description: 'Monetize intelligence. For agencies & SaaS.',
    price_monthly: 79,
    limits: {
      sessions: 25000,
      recordings: 5000,
      retention_days: 90,
      events_per_month: 50000,
      active_experiments: -1,
      active_surveys: -1,
      team_members: 5,
      features: [
        'click_heatmaps', 'scroll_heatmaps', 'live_user_view', 'session_recording', 'skip_inactivity', 'privacy_center',
        'feedback_widget', 'hover_heatmaps', 'frustration_signals', 'ab_testing', 'surveys',
        'ai_session_summaries',
        'ai_heatmap_analysis',
        'ai_form_insights',
        'ai_assistant',
        'funnels',
        'user_journeys',
        'form_analytics',
        'element_clicks',
        'js_errors',
        'performance_metrics',
        'team_management',
        'data_export',
        'priority_support'
      ]
    }
  },
  {
    name: 'Enterprise',
    description: 'Raw data & control. For heavy data orgs.',
    price_monthly: 299,
    status: 'inactive',
    limits: {
      sessions: 150000,
      recordings: 25000,
      retention_days: 365,
      events_per_month: -1,
      active_experiments: -1,
      active_surveys: -1,
      team_members: -1,
      features: [
        'click_heatmaps', 'scroll_heatmaps', 'live_user_view', 'session_recording', 'skip_inactivity', 'privacy_center',
        'feedback_widget', 'hover_heatmaps', 'frustration_signals', 'ab_testing', 'surveys',
        'ai_session_summaries', 'ai_heatmap_analysis', 'ai_form_insights', 'ai_assistant',
        'funnels', 'user_journeys', 'form_analytics', 'element_clicks', 'js_errors', 'performance_metrics', 
        'team_management', 'data_export', 'priority_support',
        'ai_cohort_generator',
        'cohorts',
        'network_health',
        'api_access',
        'session_notes',
        'dedicated_support',
        'priority_ai_processing'
      ]
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
            // Upsert (Insert with conflict on id)
            // But we have the ID. Let's try upserting with the known ID to force overwrite.
            const { error: upsertError } = await supabase
                .from('subscription_plans')
                .upsert({
                    id: data.id,
                    name: plan.name,
                    description: plan.description,
                    price_monthly: plan.price_monthly,
                    status: plan.status || 'active',
                    limits: plan.limits
                    // created_at is preserved if not specified? No, upsert might overwrite. 
                    // Let's stick to update but maybe log data.id to be sure.
                });

            if (upsertError) {
             // Fallback to update if upsert fails, or logging
             console.log(`Upsert approach.`)
             console.error(JSON.stringify(upsertError, null, 2));
            } else {
                 console.log(`Upserted ${plan.name}`);
            }
        }
    }
    console.log('Done.');
}

seed();
