
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspect() {
  const userId = 'c4c0dc19-8e55-4bb7-8c34-25200ed01a23';
  console.log('Inspecting User:', userId);

  // 1. Get Profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  console.log('Profile:', profile);

  // 2. Get All Subscriptions
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, status, plan_id, created_at, active_until:current_period_end, plan:subscription_plans(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const simplified = subs.map(s => ({
      id: s.id.slice(0, 8),
      status: s.status,
      plan: s.plan?.name,
      created: new Date(s.created_at).toISOString().slice(0, 10),
      active_until: s.active_until ? new Date(s.active_until).toISOString().slice(0, 10) : 'N/A'
  }));

  console.table(simplified);

  // 3. Check Consistency
  if (!profile.subscription_id) {
     console.log('❌ Profile has NO subscription_id');
  } else {
     const linkedSub = subs.find(s => s.id === profile.subscription_id);
     if (linkedSub) {
        console.log('✅ Profile points to:', linkedSub.id.slice(0, 8), 'Plan:', linkedSub.plan?.name);
     } else {
        console.log('❌ Profile points to missing subscription:', profile.subscription_id);
     }
  }
}

inspect();
