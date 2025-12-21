require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@clickhouse/client');

// Use env vars or defaults
const config = {
    host: process.env.CLICKHOUSE_URL || process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DATABASE || 'default',
};

async function init() {
    console.log('Connecting to ClickHouse at', config.host);
    
    // Parse URL if provided
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

    const query = `
    CREATE TABLE IF NOT EXISTS api_metrics (
        timestamp DateTime DEFAULT now(),
        path String,
        method String,
        status_code UInt16,
        duration_ms UInt16,
        ip IPv4,
        user_agent String,
        site_id String DEFAULT ''
    ) ENGINE = MergeTree()
    ORDER BY (timestamp, path);
    `;

    try {
        await client.query({ query });
        console.log('✅ Table api_metrics created or already exists.');
    } catch (e) {
        console.error('❌ Failed to create table:', e);
    }
    
    await client.close();
}

init();
