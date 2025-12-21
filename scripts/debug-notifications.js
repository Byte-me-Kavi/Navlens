
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testNotif() {
  console.log('Testing notifications table...');
  const { error } = await supabase.from('notifications').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('Check Failed:', error.message);
    if (error.message.includes('relation "notifications" does not exist') || error.code === '42P01') {
        console.log('Please apply the migration "supabase/migrations/20251221_create_notifications.sql" to your database.');
    }
  } else {
    console.log('Notifications table exists! Count works.');
  }
}

testNotif();
