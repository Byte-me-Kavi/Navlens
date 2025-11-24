const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const clickhouseUrl = envContent
  .split("\n")
  .find((line) => line.startsWith("CLICKHOUSE_URL="))
  .split("=")[1];

const { createClient } = require("@clickhouse/client");
const client = createClient({ url: clickhouseUrl });

async function testNewQuery() {
  try {
    const query = `SELECT 0 as scroll_percentage, count() as sessions FROM (SELECT session_id FROM events WHERE site_id = '10104f75-c77f-4851-ab22-d9bf99ce2ff2' AND page_path = '/' AND device_type = 'desktop' AND timestamp >= '2025-11-01 00:00:00' AND timestamp <= '2025-12-01 00:00:00' AND scroll_depth IS NOT NULL GROUP BY session_id HAVING floor(max(scroll_depth) * 100) >= 0) UNION ALL SELECT 5 as scroll_percentage, count() as sessions FROM (SELECT session_id FROM events WHERE site_id = '10104f75-c77f-4851-ab22-d9bf99ce2ff2' AND page_path = '/' AND device_type = 'desktop' AND timestamp >= '2025-11-01 00:00:00' AND timestamp <= '2025-12-01 00:00:00' AND scroll_depth IS NOT NULL GROUP BY session_id HAVING floor(max(scroll_depth) * 100) >= 5) ORDER BY scroll_percentage ASC`;
    const result = await client.query({
      query: query,
      format: "JSONEachRow",
    });
    const data = await result.json();
    console.log("New scroll data:", data);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testNewQuery();
