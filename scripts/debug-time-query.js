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
        // Query recent rows to see raw timestamps
        const result = await client.query({
            query: `
                SELECT 
                    timestamp, 
                    toStartOfMinute(timestamp) as minute_bucket,
                    path
                FROM api_metrics 
                ORDER BY timestamp DESC 
                LIMIT 5
            `,
            format: 'JSONEachRow',
        });

        const rows = await result.json();
        console.log('--- Database Rows (Raw) ---');
        console.log(rows);

        const now = new Date();
        console.log('\n--- JS Time ---');
        console.log('JS new Date() (Local):', now.toString());
        console.log('JS new Date() (ISO):', now.toISOString());
        console.log('JS timestamp:', now.getTime());

        if (rows.length > 0) {
            const dbTime = new Date(rows[0].minute_bucket);
            console.log('\n--- Comparison ---');
            console.log('DB Time parsed by JS:', dbTime.toString());
            console.log('DB Time ISO:', dbTime.toISOString());
        }

    } catch (e) {
        console.error('Error querying ClickHouse:', e);
    }
    
    await client.close();
}

check();
