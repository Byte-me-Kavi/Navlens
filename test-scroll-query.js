const fs = require("fs");
const envContent = fs.readFileSync(".env.local", "utf8");
const clickhouseUrl = envContent
  .split("\n")
  .find((line) => line.startsWith("CLICKHOUSE_URL="))
  .split("=")[1];

const { createClient } = require("@clickhouse/client");
const client = createClient({ url: clickhouseUrl });

async function testScrollQuery() {
  try {
    console.log("Testing scroll heatmap query...");

    const siteId = "10104f75-c77f-4851-ab22-d9bf99ce2ff2";
    const pagePath = "/";
    const deviceType = "desktop";
    const startDate = "2024-01-01 00:00:00";
    const endDate = "2025-01-01 00:00:00";

    // First check if there are any scroll events
    const checkQuery = `
      SELECT COUNT(*) as scroll_events
      FROM events
      WHERE site_id = {siteId:String}
        AND page_path = {pagePath:String}
        AND device_type = {deviceType:String}
        AND timestamp >= {startDate:DateTime}
        AND timestamp <= {endDate:DateTime}
        AND scroll_depth IS NOT NULL
    `;

    const checkResult = await client.query({
      query: checkQuery,
      query_params: { siteId, pagePath, deviceType, startDate, endDate },
      format: "JSONEachRow",
    });

    const checkData = await checkResult.json();
    console.log("Total scroll events:", checkData[0]?.scroll_events || 0);

    // Test the new cumulative query
    const histogramQuery = `
      SELECT
        scroll_percentage,
        sum(sessions) OVER (ORDER BY scroll_percentage DESC) as sessions
      FROM (
        SELECT
          floor(max_depth) as scroll_percentage,
          count(session_id) as sessions
        FROM (
          SELECT
            session_id,
            max(scroll_depth) as max_depth
          FROM events
          WHERE site_id = {siteId:String}
            AND page_path = {pagePath:String}
            AND device_type = {deviceType:String}
            AND timestamp >= {startDate:DateTime}
            AND timestamp <= {endDate:DateTime}
            AND scroll_depth IS NOT NULL
          GROUP BY session_id
        )
        GROUP BY scroll_percentage
      )
      ORDER BY scroll_percentage ASC
    `;

    const result = await client.query({
      query: histogramQuery,
      query_params: { siteId, pagePath, deviceType, startDate, endDate },
      format: "JSONEachRow",
    });

    const data = await result.json();
    console.log("Scroll heatmap data:", data);
  } catch (error) {
    console.error("Query failed:", error.message);
    console.error("Full error:", error);
  }
}

testScrollQuery();
