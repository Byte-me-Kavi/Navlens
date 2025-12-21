require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@clickhouse/client');

const config = {
    host: process.env.CLICKHOUSE_URL || process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DATABASE || 'default',
};

async function check() {
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
        // 1. Check Row Count
        const countResult = await client.query({
            query: 'SELECT count() as count FROM api_metrics',
            format: 'JSONEachRow',
        });
        const count = await countResult.json();
        console.log('Total Rows in api_metrics:', count[0].count);

        // 2. Check Unique Paths
        const pathsResult = await client.query({
            query: 'SELECT DISTINCT path FROM api_metrics LIMIT 10',
            format: 'JSONEachRow',
        });
        const paths = await pathsResult.json();
        console.log('Unique Paths found:', paths.map(p => p.path));

    } catch (e) {
        console.error('Error querying ClickHouse:', e);
    }
    
    await client.close();
}

check();
