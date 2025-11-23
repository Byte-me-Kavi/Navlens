/**
 * Diagnostic script to check for duplicate overlays
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const { createClient } = require("@clickhouse/client");
const fs = require("fs");

// Load .env file manually
const envFile = fs.readFileSync(".env.local", "utf-8");
const env = {};
envFile.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.+)$/);
  if (match) {
    env[match[1]] = match[2];
  }
});
process.env.CLICKHOUSE_URL = env.CLICKHOUSE_URL;

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

async function diagnoseDuplicates() {
  const clickhouse = createClient(createClickHouseConfig());

  console.log("🔍 Diagnosing duplicate overlay issue...\n");

  // Query 1: Check "Get Started" button clicks
  const getStartedQuery = `
    SELECT 
      element_tag,
      element_selector,
      element_text,
      x_relative,
      y_relative,
      document_width,
      document_height,
      COUNT(*) as click_count
    FROM events
    WHERE event_type = 'click' 
      AND element_text LIKE '%Get Started%'
      AND page_path = '/'
    GROUP BY element_tag, element_selector, element_text, x_relative, y_relative, document_width, document_height
    ORDER BY click_count DESC
  `;

  const result1 = await clickhouse.query({
    query: getStartedQuery,
    format: "JSONEachRow",
  });
  const getStartedData = await result1.json();

  console.log("📊 Get Started Button Clicks:");
  console.log(JSON.stringify(getStartedData, null, 2));

  // Query 2: Check all clicks with their element positions
  const allClicksQuery = `
    SELECT 
      element_tag,
      element_selector,
      element_text,
      x_relative,
      y_relative,
      x,
      y,
      document_width,
      document_height,
      COUNT(*) as click_count
    FROM events
    WHERE event_type = 'click' 
      AND page_path = '/'
    GROUP BY element_tag, element_selector, element_text, x_relative, y_relative, x, y, document_width, document_height
    HAVING click_count > 1
    ORDER BY click_count DESC
    LIMIT 10
  `;

  const result2 = await clickhouse.query({
    query: allClicksQuery,
    format: "JSONEachRow",
  });
  const duplicatesData = await result2.json();

  console.log("\n📊 Elements with Multiple Click Records:");
  console.log(JSON.stringify(duplicatesData, null, 2));

  await clickhouse.close();
}

diagnoseDuplicates().catch(console.error);
