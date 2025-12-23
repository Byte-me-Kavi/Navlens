
const { createClient } = require('@clickhouse/client');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  let clientConfig = {};
  
  if (process.env.CLICKHOUSE_URL) {
    console.log('Using CLICKHOUSE_URL from environment');
    clientConfig = { url: process.env.CLICKHOUSE_URL };
  } else {
    console.log('Using individual CLICKHOUSE_* variables');
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
    const outFile = 'analysis_clean.txt';
    fs.writeFileSync(outFile, '--- FETCHING ACTIVE SITES ---\n');

    // Get sites with usage in the last 30 days
    const sitesQuery = await client.query({
      query: `
        SELECT site_id, count() as event_count 
        FROM events 
        WHERE timestamp > now() - INTERVAL 30 DAY 
        GROUP BY site_id 
        ORDER BY event_count DESC 
        LIMIT 5
      `,
      format: 'JSONEachRow',
    });
    const sites = await sitesQuery.json();
    
    if (sites.length === 0) {
      fs.appendFileSync(outFile, 'No active sites found.\n');
      return;
    }

    fs.appendFileSync(outFile, `Found ${sites.length} active sites.\n`);
    
    for (const site of sites) {
      fs.appendFileSync(outFile, `\nAnalyzing Site ID: ${site.site_id} (Events: ${site.event_count})\n`);
      
      const countQuery = await client.query({
        query: `
          SELECT uniq(page_path) as path_count 
          FROM events 
          WHERE site_id = '${site.site_id}' 
          AND toStartOfMonth(timestamp) = toStartOfMonth(now())
        `,
        format: 'JSONEachRow',
      });
      const countResult = await countQuery.json();
      fs.appendFileSync(outFile, `Current Month Unique Paths Count: ${countResult[0].path_count}\n`);

      fs.appendFileSync(outFile, '--- Top 50 Paths (Alphabetical) ---\n');
      const pathsQuery = await client.query({
        query: `
          SELECT DISTINCT page_path 
          FROM events 
          WHERE site_id = '${site.site_id}' 
          ORDER BY page_path ASC 
          LIMIT 50
        `,
        format: 'JSONEachRow',
      });
      const paths = await pathsQuery.json();
      paths.forEach(p => fs.appendFileSync(outFile, `  - ${p.page_path}\n`));

      if (countResult[0].path_count > 50) {
        fs.appendFileSync(outFile, '\n--- Sample of "Hidden" Paths (Not in Top 50) ---\n');
        
        const randomPathsQuery = await client.query({
            query: `
                SELECT DISTINCT page_path 
                FROM events 
                WHERE site_id = '${site.site_id}' 
                ORDER BY page_path DESC 
                LIMIT 50
            `,
            format: 'JSONEachRow'
        });
        const randomPaths = await randomPathsQuery.json();
        randomPaths.forEach(p => fs.appendFileSync(outFile, `  - ${p.page_path}\n`));
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main();
