const { createClient } = require('@clickhouse/client');
require('dotenv').config({ path: '.env.local' });

const config = {
    host: process.env.CLICKHOUSE_URL || process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DATABASE || 'default',
};

async function checkTables() {
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
        const result = await client.query({
            query: 'SHOW TABLES',
            format: 'JSON'
        });
        const tables = await result.json();
        console.log('Tables found:', tables.data.map(t => t.name));

        // specific check for dashboard_stats_hourly
        const result2 = await client.query({
            query: "SELECT name FROM system.tables WHERE name = 'dashboard_stats_hourly'",
            format: 'JSON'
        });
        const exists = await result2.json();
        if (exists.data.length > 0) {
            console.log('dashboard_stats_hourly exists. Describing...');
            const desc = await client.query({
                query: 'DESCRIBE dashboard_stats_hourly',
                format: 'JSON'
            });
            console.log(await desc.json());
        } else {
            console.log('dashboard_stats_hourly does NOT exist.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
    await client.close();
}

checkTables();
