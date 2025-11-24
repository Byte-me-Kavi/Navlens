const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const clickhouseUrl = envContent
  .split("\n")
  .find((line) => line.startsWith("CLICKHOUSE_URL="))
  .split("=")[1];

const { createClient } = require("@clickhouse/client");
const client = createClient({ url: clickhouseUrl });

async function checkTotalSessions() {
  try {
    // Total sessions that visited the homepage
    const totalResult = await client.query({
      query: `SELECT count(distinct session_id) as total_sessions FROM events WHERE site_id = '10104f75-c77f-4851-ab22-d9bf99ce2ff2' AND page_path = '/' AND device_type = 'desktop' AND timestamp >= '2025-11-01 00:00:00' AND timestamp <= '2025-12-01 00:00:00'`,
      format: "JSONEachRow",
    });
    const totalData = await totalResult.json();
    console.log(
      "Total sessions for homepage:",
      totalData[0]?.total_sessions || 0
    );

    // Sessions with scroll events
    const scrollResult = await client.query({
      query: `SELECT count(distinct session_id) as scroll_sessions FROM events WHERE site_id = '10104f75-c77f-4851-ab22-d9bf99ce2ff2' AND page_path = '/' AND device_type = 'desktop' AND timestamp >= '2025-11-01 00:00:00' AND timestamp <= '2025-12-01 00:00:00' AND scroll_depth IS NOT NULL`,
      format: "JSONEachRow",
    });
    const scrollData = await scrollResult.json();
    console.log(
      "Sessions with scroll events:",
      scrollData[0]?.scroll_sessions || 0
    );
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkTotalSessions();
