
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAll() {
  console.log('🔍 Scanning all users for subscription inconsistencies...');

  // Get all users with subscriptions
  // We'll just fetch all subscriptions and group by user_id
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, created_at, status')
    .order('created_at', { ascending: false });

  if (error) {
      console.error('Fetch error:', error);
      return;
  }

  const userSubs = {};
  subs.forEach(s => {
      if (!userSubs[s.user_id]) userSubs[s.user_id] = [];
      userSubs[s.user_id].push(s);
  });

  let fixedCount = 0;

  for (const userId in userSubs) {
      const all = userSubs[userId];
      // Filter for 'active' or just check if total count > 1? 
      // Ideally a user should have only ONE row if we are strict, or at least only ONE active.
      // But preserving history is fine. The issue is MULTIPLE ACTIVE or Profile pointing to wrong one.
      
      const activeSubs = all.filter(s => s.status === 'active' || s.status === 'trialing');
      
      if (activeSubs.length > 1) {
          console.log(`⚠️ User ${userId} has ${activeSubs.length} ACTIVE subscriptions.`);
          
          // Keep the newest active one
          const toKeep = activeSubs[0]; // First is newest due to sort
          const toFix = activeSubs.slice(1);
          
          // Fix: Mark others as canceled
          const idsToCancel = toFix.map(s => s.id);
          console.log(`   Markdown as canceled: ${idsToCancel.join(', ')}`);
          
          await supabase.from('subscriptions').update({ status: 'canceled' }).in('id', idsToCancel);
          
          // Ensure profile points to the keeper
          await supabase.from('profiles').update({ subscription_id: toKeep.id }).eq('user_id', userId);
          fixedCount++;
      } 
      else if (activeSubs.length === 1) {
          // Just ensure profile sync
          const current = activeSubs[0];
          // We can't easily check profile without fetching it, so just blind update (cheap enough for this script)
          // await supabase.from('profiles').update({ subscription_id: current.id }).eq('user_id', userId);
      }
  }

  console.log(`✅ Scan complete. Fixed ${fixedCount} users with duplicate active subscriptions.`);
}

fixAll();
