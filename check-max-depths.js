const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const clickhouseUrl = envContent
  .split("\n")
  .find((line) => line.startsWith("CLICKHOUSE_URL="))
  .split("=")[1];

const { createClient } = require("@clickhouse/client");
const client = createClient({ url: clickhouseUrl });

async function checkMaxDepths() {
  try {
    const result = await client.query({
      query: `SELECT floor(max_depth * 100) as scroll_percentage, count(*) as sessions FROM (SELECT session_id, max(scroll_depth) as max_depth FROM events WHERE site_id = '10104f75-c77f-4851-ab22-d9bf99ce2ff2' AND page_path = '/' AND device_type = 'desktop' AND timestamp >= '2025-11-01 00:00:00' AND timestamp <= '2025-12-01 00:00:00' AND scroll_depth IS NOT NULL GROUP BY session_id) GROUP BY scroll_percentage ORDER BY scroll_percentage`,
      format: "JSONEachRow",
    });
    const data = await result.json();
    console.log("Sessions by max scroll percentage:", data);
    console.log(
      "Total sessions:",
      data.reduce((sum, item) => sum + parseInt(item.sessions), 0)
    );
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkMaxDepths();
