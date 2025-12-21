const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function listTables() {
    // Try environment variables or default local
    const url = process.env.CLICKHOUSE_URL;
    let chHost, chUser, chPass, chDb;

    if (url) {
        console.log('Using CLICKHOUSE_URL');
        // Simple regex parse (assuming http(s)://user:pass@host:port/db)
        const match = url.match(/^(https?):\/\/([^:]+):([^@]+)@([^:/]+):?(\d*)\/(.+)$/);
        if (match) {
            chHost = `${match[1]}://${match[4]}:${match[5] || '8123'}`;
            chUser = decodeURIComponent(match[2]);
            chPass = decodeURIComponent(match[3]);
            chDb = match[6];
        } else {
             console.log('URL parse failed, trying direct fetch to URL');
             // If url is just host
             chHost = url; 
        }
    }

    const host = chHost || process.env.CLICKHOUSE_HOST || 'http://localhost:8123';
    const user = chUser || process.env.CLICKHOUSE_USER || 'default';
    const password = chPass || process.env.CLICKHOUSE_PASSWORD || '';
    const db = chDb || process.env.CLICKHOUSE_DATABASE || 'default';


    console.log(`Connecting to ${host} (User: ${user}, DB: ${db})...`);

    try {
        const query = 'DESCRIBE events';
        const url = `${host}/?query=${encodeURIComponent(query)}&user=${user}&password=${password}&database=${db}`;
        
        console.log('--- events ---');
        const res = await fetch(url);
        console.log(await res.text());

        const query2 = 'DESCRIBE subscription_usage_monthly';
        const url2 = `${host}/?query=${encodeURIComponent(query2)}&user=${user}&password=${password}&database=${db}`;
        console.log('--- subscription_usage_monthly ---');
        const res2 = await fetch(url2);
        console.log(await res2.text());
    } catch (e) {
        console.error('Connection Failed:', e.message);
    }
}

listTables();
