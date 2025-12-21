
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugBilling() {
  console.log('--- Debugging Billing Counts ---');
  let output = '--- Debugging Billing --- \n';

  // 1. Total Users (Auth vs Profile)
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  output += `Total Auth Users: ${authUsers?.length}\n`;
  
  const { count: totalProfiles } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  output += `Total Profiles: ${totalProfiles}\n`;

  // 2. Subscription Breakdown
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, status, plan:subscription_plans(name, price_usd)')
    .order('created_at', { ascending: false });

  const uniqueSubs = {};
  subs.forEach(s => {
      // Keep first (latest)
      if (!uniqueSubs[s.user_id]) uniqueSubs[s.user_id] = s;
  });

  const active = Object.values(uniqueSubs).filter(s => s.status === 'active' || s.status === 'trialing');
  output += `Total Active/Trialing Unique Subs: ${active.length}\n\n`;

  const breakdown = {};
  let totalValue = 0;
  active.forEach(s => {
      const name = s.plan?.name || 'Unknown';
      const price = s.plan?.price_usd || 0;
      breakdown[name] = (breakdown[name] || 0) + 1;
      totalValue += price;
  });

  output += 'Plan Breakdown:\n' + JSON.stringify(breakdown, null, 2) + '\n';
  output += `Total Plan Value (MRR): $${totalValue}\n`;

  fs.writeFileSync('billing-debug.txt', output);
  console.log('DONE');
}

debugBilling();
