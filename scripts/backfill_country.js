
const { createClient } = require('@clickhouse/client');
require('dotenv').config({ path: '.env.local' });

async function backfill() {
  const client = createClient({
    url: process.env.CLICKHOUSE_HOST,
    username: process.env.CLICKHOUSE_USER,
    password: process.env.CLICKHOUSE_PASSWORD,
  });

  try {
    console.log('Starting backfill of country = "LK"...');
    // Using ALTER TABLE UPDATE for mutations in ClickHouse
    await client.exec({
      query: `ALTER TABLE default.events UPDATE country = 'LK' WHERE country = ''`,
      clickhouse_settings: {
        mutations_sync: '1', // Wait for mutation to finish
      },
    });
    console.log('✅ Backfill complete. All empty country fields set to "LK".');
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await client.close();
  }
}

backfill();
