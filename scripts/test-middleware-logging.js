require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@clickhouse/client');

// Mocking the client creation from lib/clickhouse.ts for standalone test
const config = {
    host: process.env.CLICKHOUSE_URL || process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DATABASE || 'default',
};

async function testInsert() {
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

    const metric = {
        path: '/test-path-debug',
        method: 'GET',
        status_code: 200,
        duration_ms: 50,
        ip: '127.0.0.1',
        user_agent: 'DebugScript',
        site_id: ''
    };

    console.log('Attempting to insert metric:', metric);

    try {
        await client.insert({
            table: 'api_metrics',
            values: [metric],
            format: 'JSONEachRow',
        });
        console.log('✅ Insert successful!');
    } catch (e) {
        console.error('❌ Insert failed:', e);
    }
    
    await client.close();
}

testInsert();
