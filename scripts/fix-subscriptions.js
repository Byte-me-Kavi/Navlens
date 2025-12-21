
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  const userId = 'c4c0dc19-8e55-4bb7-8c34-25200ed01a23';
  console.log('Fixing User:', userId);

  // 1. Get All Subscriptions
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, created_at, plan_id, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }); // Newest first

  if (!subs || subs.length === 0) {
      console.log('No subscriptions found.');
      return;
  }

  console.log(`Found ${subs.length} subscriptions.`);

  // Keep the first (newest), delete others
  const toKeep = subs[0];
  const toDelete = subs.slice(1);

  if (toDelete.length > 0) {
      console.log(`Deleting ${toDelete.length} old subscriptions...`);
      const ids = toDelete.map(s => s.id);
      await supabase.from('subscriptions').delete().in('id', ids);
      console.log('Deleted:', ids);
  } else {
      console.log('No duplicates to delete.');
  }

  // 2. Ensure Profile is Synced
  console.log(`Linking Profile to Subscription ${toKeep.id}...`);
  await supabase.from('profiles').update({ subscription_id: toKeep.id }).eq('user_id', userId);
  
  console.log('✅ Fix Complete. User should have exactly 1 subscription now.');
}

fix();
