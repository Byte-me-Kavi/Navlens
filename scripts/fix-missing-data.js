
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMissing() {
  console.log('--- Fixing Missing User Data ---');

  // 1. Get All Auth Users
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError || !users) {
      console.error('Auth Error:', authError);
      return;
  }
  console.log(`Found ${users.length} Auth Users.`);

  // 2. Get Free Plan ID
  const { data: freePlan } = await supabase.from('subscription_plans').select('id').ilike('name', '%Free%').single();
  if (!freePlan) {
      console.error('Could not find Free plan.');
      return;
  }

  for (const user of users) {
      // Check Profile
      const { data: profile } = await supabase.from('profiles').select('id, subscription_id').eq('user_id', user.id).maybeSingle();
      
      let subId = profile?.subscription_id;

      // Check Subscription (if ID known or search by user_id)
      if (!subId) {
          const { data: sub } = await supabase.from('subscriptions').select('id').eq('user_id', user.id).maybeSingle();
          subId = sub?.id;
      }

      // If Subscription missing, create it
      if (!subId) {
          console.log(`Creating missing subscription for ${user.email}...`);
          const { data: newSub, error: subError } = await supabase.from('subscriptions').insert({
              user_id: user.id,
              plan_id: freePlan.id,
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              start_date: new Date().toISOString()
          }).select('id').single();

          if (subError) console.error('Sub create error:', subError);
          else subId = newSub.id;
      }

      // If Profile missing, create it
      if (!profile) {
          console.log(`Creating missing profile for ${user.email}...`);
          const { error: profError } = await supabase.from('profiles').insert({
              user_id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || 'User',
              subscription_id: subId
          });
          if (profError) console.error('Profile create error:', profError);
      } 
      else if (!profile.subscription_id && subId) {
          // Link Profile if unlinked
           console.log(`Linking profile for ${user.email} to sub ${subId}...`);
           await supabase.from('profiles').update({ subscription_id: subId }).eq('user_id', user.id);
      }
  }

  console.log('✅ Fix Complete. All users should now have data.');
}

fixMissing();
