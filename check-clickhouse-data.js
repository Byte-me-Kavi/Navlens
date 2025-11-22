/**
 * Script to check ClickHouse data for debugging
 * Run with: node check-clickhouse-data.js
 */

const { createClient } = require("@clickhouse/client");

// Initialize ClickHouse client
function createClickHouseConfig() {
  const url = process.env.CLICKHOUSE_URL;
  if (url) {
    // Parse ClickHouse URL: https://username:password@host:port/database
    const urlPattern = /^https?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const match = url.match(urlPattern);
    if (match) {
      const [, username, password, host, port, database] = match;
      return {
        host: `https://${host}:${port}`,
        username,
        password,
        database,
      };
    }
  }

  // Fallback to individual env vars
  return {
    host: process.env.CLICKHOUSE_HOST,
    username: process.env.CLICKHOUSE_USERNAME,
    password: process.env.CLICKHOUSE_PASSWORD,
    database: process.env.CLICKHOUSE_DATABASE,
  };
}

async function checkData() {
  const clickhouse = createClient(createClickHouseConfig());

  console.log("🔍 Checking ClickHouse data...\n");

  // Query 1: Count total clicks
  const totalQuery = `
    SELECT COUNT(*) as total
    FROM events
    WHERE event_type = 'click'
  `;

  const totalResult = await clickhouse.query({
    query: totalQuery,
    format: "JSONEachRow",
  });
  const totalRows = await totalResult.json();
  console.log("📊 Total clicks in database:", totalRows[0]?.total || 0);

  // Query 2: Count clicks with valid dimensions
  const validQuery = `
    SELECT COUNT(*) as valid_count
    FROM events
    WHERE event_type = 'click'
      AND document_width > 0
      AND document_height > 0
  `;

  const validResult = await clickhouse.query({
    query: validQuery,
    format: "JSONEachRow",
  });
  const validRows = await validResult.json();
  console.log(
    "✅ Clicks with valid dimensions (document_width > 0):",
    validRows[0]?.valid_count || 0
  );

  // Query 3: Count clicks with zero dimensions (old data)
  const zeroQuery = `
    SELECT COUNT(*) as zero_count
    FROM events
    WHERE event_type = 'click'
      AND (document_width = 0 OR document_height = 0)
  `;

  const zeroResult = await clickhouse.query({
    query: zeroQuery,
    format: "JSONEachRow",
  });
  const zeroRows = await zeroResult.json();
  console.log(
    "❌ Clicks with zero dimensions (old data):",
    zeroRows[0]?.zero_count || 0
  );

  // Query 4: Show latest 5 clicks with their dimensions
  const latestQuery = `
    SELECT
      timestamp,
      page_path,
      document_width,
      document_height,
      x_relative,
      y_relative
    FROM events
    WHERE event_type = 'click'
    ORDER BY timestamp DESC
    LIMIT 5
  `;

  console.log("\n📅 Latest 5 clicks:");
  const latestResult = await clickhouse.query({
    query: latestQuery,
    format: "JSONEachRow",
  });
  const latestRows = await latestResult.json();

  if (latestRows.length === 0) {
    console.log("   No clicks found in database");
  } else {
    latestRows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.timestamp} | page: ${row.page_path}`);
      console.log(
        `      Dimensions: ${row.document_width}x${row.document_height}`
      );
      console.log(`      Position: (${row.x_relative}, ${row.y_relative})`);
    });
  }

  console.log("\n💡 SOLUTION:");
  if (validRows[0]?.valid_count === 0 || validRows[0]?.valid_count === "0") {
    console.log("   ⚠️ No clicks with valid dimensions found!");
    console.log("   → Go to your website and make some NEW clicks");
    console.log("   → The heatmap will show those new clicks");
    console.log(
      "   → Old clicks (with document_width=0) are filtered out by the query"
    );
  } else {
    console.log(
      `   ✓ Found ${validRows[0].valid_count} clicks with valid dimensions`
    );
    console.log("   → These clicks should appear in the heatmap");
    console.log(
      "   → If not showing, check browser console for frontend errors"
    );
  }

  await clickhouse.close();
}

checkData().catch(console.error);
