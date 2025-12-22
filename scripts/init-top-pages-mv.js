const { createClient } = require('@clickhouse/client');
require('dotenv').config({ path: '.env.local' });

const config = {
    host: process.env.CLICKHOUSE_URL || process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DATABASE || 'default',
};

async function initTopPagesView() {
    console.log('Connecting to ClickHouse...');
    
    let clientConfig = {};
    if (config.host.startsWith('https://') && config.host.includes('@')) {
         clientConfig = { url: config.host };
    } else {
        clientConfig = {
            host: config.host,
            username: config.username,
            password: config.password,
            database: config.database
        };
    }

    const client = createClient(clientConfig);

    try {
        console.log('Creating top_pages_hourly table...');
        await client.query({
            query: `
            CREATE TABLE IF NOT EXISTS top_pages_hourly (
                site_id String,
                page_path String,
                hour DateTime,
                visits UInt64
            ) ENGINE = SummingMergeTree()
            ORDER BY (site_id, page_path, hour)
            TTL hour + INTERVAL 90 DAY;
            `
        });
        console.log('✅ Created table top_pages_hourly');

        console.log('Creating materialized view top_pages_hourly_mv...');
        await client.query({
            query: `
            CREATE MATERIALIZED VIEW IF NOT EXISTS top_pages_hourly_mv 
            TO top_pages_hourly 
            AS SELECT
                site_id,
                page_path,
                toStartOfHour(timestamp) as hour,
                count(*) as visits
            FROM events
            WHERE event_type = 'page_view'
            GROUP BY site_id, page_path, toStartOfHour(timestamp);
            `
        });
        console.log('✅ Created materialized view top_pages_hourly_mv');

    } catch (e) {
        console.error('❌ Error:', e);
    }
    await client.close();
}

initTopPagesView();
