/**
 * Test script for snapshot API
 */

const fetch = require("node-fetch");

const API_BASE = "http://localhost:3000";

// Test cases based on actual Supabase data
const testCases = [
  {
    name: "Desktop Homepage - Site 1",
    siteId: "10104f75-c77f-4851-ab22-d9bf99ce2ff2",
    pagePath: "/",
    deviceType: "desktop",
  },
  {
    name: "Mobile Homepage - Site 1",
    siteId: "10104f75-c77f-4851-ab22-d9bf99ce2ff2",
    pagePath: "/",
    deviceType: "mobile",
  },
  {
    name: "Desktop About - Site 1",
    siteId: "10104f75-c77f-4851-ab22-d9bf99ce2ff2",
    pagePath: "/about",
    deviceType: "desktop",
  },
  {
    name: "Desktop Homepage - Site 2",
    siteId: "52db6643-bda5-4b02-9a38-658b14f7f29a",
    pagePath: "/",
    deviceType: "desktop",
  },
  {
    name: "Desktop Dashboard Heatmaps - Site 2",
    siteId: "52db6643-bda5-4b02-9a38-658b14f7f29a",
    pagePath: "/dashboard/heatmaps",
    deviceType: "desktop",
  },
];

async function testSnapshotAPI() {
  console.log("\n=== Testing Snapshot API ===\n");
  console.log(`API Base URL: ${API_BASE}\n`);

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`   Site ID: ${testCase.siteId}`);
    console.log(`   Page: ${testCase.pagePath}`);
    console.log(`   Device: ${testCase.deviceType}`);

    try {
      const response = await fetch(`${API_BASE}/api/get-snapshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId: testCase.siteId,
          pagePath: testCase.pagePath,
          deviceType: testCase.deviceType,
        }),
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        const hasSnapshot = !!data.snapshot;
        const hasStyles = Array.isArray(data.styles);
        const hasOrigin = !!data.origin;

        console.log(`   ✅ SUCCESS`);
        console.log(`      - Has snapshot: ${hasSnapshot}`);
        console.log(
          `      - Has styles: ${hasStyles} (${data.styles?.length || 0} items)`
        );
        console.log(`      - Has origin: ${hasOrigin}`);
        console.log(
          `      - Snapshot size: ${data.snapshot?.length || 0} chars`
        );
      } else {
        const errorData = await response.json();
        console.log(`   ❌ FAILED`);
        console.log(`      Error:`, errorData);
      }
    } catch (error) {
      console.log(`   ❌ ERROR:`, error.message);
    }
  }

  console.log("\n\n=== Test Complete ===\n");
}

testSnapshotAPI().catch(console.error);
