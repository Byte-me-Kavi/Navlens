
const { createClient } = require('@clickhouse/client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  let clientConfig = {};
  if (process.env.CLICKHOUSE_URL) {
    clientConfig = { url: process.env.CLICKHOUSE_URL };
  } else {
    clientConfig = {
      url: process.env.CLICKHOUSE_HOST,
      username: process.env.CLICKHOUSE_USER || process.env.CLICKHOUSE_USERNAME,
      password: process.env.CLICKHOUSE_PASSWORD,
      database: process.env.CLICKHOUSE_DATABASE || 'default',
    };
  }
  const client = createClient(clientConfig);

  try {
    const fs = require('fs');
    const outFile = 'mv_inspection.txt';
    fs.writeFileSync(outFile, '--- SUBSCRIPTION USAGE MV INSPECTION ---\n');

    // Fetch raw rows from the MV for the specific site mentioned (10104f75...)
    // or just all rows to see duplication
    const mvQuery = await client.query({
      query: `
        SELECT site_id, month, unique_pages, total_clicks
        FROM subscription_usage_monthly
        WHERE month = toStartOfMonth(now())
        ORDER BY site_id
      `,
      format: 'JSONEachRow',
    });
    const rows = await mvQuery.json();
    
    fs.appendFileSync(outFile, `Total Rows in MV for this month: ${rows.length}\n`);
    
    // Group by site to show the sum vs count
    const sums = {};
    rows.forEach(r => {
        if (!sums[r.site_id]) sums[r.site_id] = { unique_pages: 0, row_count: 0 };
        sums[r.site_id].unique_pages += Number(r.unique_pages);
        sums[r.site_id].row_count++;
    });

    Object.keys(sums).forEach(siteId => {
        fs.appendFileSync(outFile, `Site: ${siteId}\n`);
        fs.appendFileSync(outFile, `  - MV Row Count: ${sums[siteId].row_count}\n`);
        fs.appendFileSync(outFile, `  - Sum of unique_pages (What API returns): ${sums[siteId].unique_pages}\n`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main();
