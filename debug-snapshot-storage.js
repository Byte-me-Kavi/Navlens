/**
 * Debug script to check Supabase snapshot storage
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
const envPath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join("=").trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSnapshotStorage() {
  console.log("\n=== Supabase Snapshot Storage Debug ===\n");

  // List all files in the snapshots bucket
  console.log('📁 Listing all files in "snapshots" bucket...\n');

  const { data: files, error } = await supabase.storage
    .from("snapshots")
    .list("", {
      limit: 100,
      offset: 0,
    });

  if (error) {
    console.error("❌ Error listing files:", error);
    return;
  }

  if (!files || files.length === 0) {
    console.log("⚠️  No files found in snapshots bucket\n");
    console.log("This could mean:");
    console.log("1. No snapshots have been uploaded yet");
    console.log("2. The bucket is empty");
    console.log("3. There might be permission issues\n");
    return;
  }

  console.log(`✅ Found ${files.length} site folders:\n`);

  // List folders (site IDs)
  const siteFolders = files.filter((f) => !f.name.includes("."));
  console.log(
    "Site ID folders:",
    siteFolders.map((f) => f.name).join(", "),
    "\n"
  );

  // Check each site folder for device folders
  for (const siteFolder of siteFolders) {
    console.log(`\n📂 Checking site: ${siteFolder.name}`);

    const { data: deviceFolders, error: deviceError } = await supabase.storage
      .from("snapshots")
      .list(siteFolder.name, {
        limit: 100,
      });

    if (deviceError) {
      console.error(`  ❌ Error listing device folders:`, deviceError);
      continue;
    }

    if (deviceFolders && deviceFolders.length > 0) {
      console.log(
        `  Device folders:`,
        deviceFolders.map((f) => f.name).join(", ")
      );

      // Check each device folder for snapshot files
      for (const deviceFolder of deviceFolders) {
        const { data: snapshots, error: snapError } = await supabase.storage
          .from("snapshots")
          .list(`${siteFolder.name}/${deviceFolder.name}`, {
            limit: 100,
          });

        if (snapError) {
          console.error(
            `    ❌ Error listing snapshots in ${deviceFolder.name}:`,
            snapError
          );
          continue;
        }

        if (snapshots && snapshots.length > 0) {
          console.log(
            `    ✅ ${deviceFolder.name}: ${snapshots.length} snapshot(s)`
          );
          snapshots.forEach((snap) => {
            console.log(
              `       - ${snap.name} (${(snap.metadata?.size || 0) / 1024} KB)`
            );
          });
        } else {
          console.log(`    ⚠️  ${deviceFolder.name}: No snapshots found`);
        }
      }
    } else {
      console.log(`  ⚠️  No device folders found`);
    }
  }

  console.log("\n\n=== Storage Structure Test ===\n");
  console.log("Expected structure:");
  console.log("snapshots/");
  console.log("  └── {site_id}/");
  console.log("      ├── desktop/");
  console.log("      │   ├── homepage.json");
  console.log("      │   └── about.json");
  console.log("      ├── tablet/");
  console.log("      │   └── homepage.json");
  console.log("      └── mobile/");
  console.log("          └── homepage.json\n");
}

// Run the debug script
debugSnapshotStorage().catch(console.error);
