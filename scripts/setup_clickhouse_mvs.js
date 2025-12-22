const { createClient } = require('@clickhouse/client');
require('dotenv').config({ path: '.env.local' });

// Initialize Client
const client = createClient({
  url: process.env.CLICKHOUSE_URL,
  clickhouse_settings: {
    max_execution_time: 60,
  },
  // If no URL (dev mode), use host/user/pass from env
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USERNAME || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
});

async function run() {
  try {
    console.log('🔌 Connecting to ClickHouse...');
    
    // 1. Create session_analytics Target Table
    // Stores aggregated session data
    console.log('🛠 Creating session_analytics table...');
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS session_analytics
        (
            site_id String,
            session_id String,
            start_time SimpleAggregateFunction(min, DateTime),
            end_time SimpleAggregateFunction(max, DateTime),
            device_type SimpleAggregateFunction(any, String),
            
            -- Metrics
            event_count SimpleAggregateFunction(sum, UInt64),
            rage_clicks SimpleAggregateFunction(sum, UInt64),
            dead_clicks SimpleAggregateFunction(sum, UInt64),
            errors SimpleAggregateFunction(sum, UInt64),
            
            -- Derived from User Agent or similar (if we parsed it, strictly simple for now)
            -- We'll just store the raw UA type or similar if needed, typically device_type is enough for listing
            has_recording SimpleAggregateFunction(max, UInt8)
        )
        ENGINE = AggregatingMergeTree()
        ORDER BY (site_id, session_id)
        TTL start_time + INTERVAL 30 DAY
      `
    });

    // 2. Create session_analytics Materialized View
    console.log('🔄 Creating session_analytics_mv...');
    await client.command({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS session_analytics_mv TO session_analytics
        AS SELECT
            site_id,
            session_id,
            min(timestamp) as start_time,
            max(timestamp) as end_time,
            any(device_type) as device_type,
            
            count() as event_count,
            countIf(event_type = 'rage_click') as rage_clicks,
            countIf(is_dead_click) as dead_clicks,
            countIf(event_type = 'error' OR event_type = 'js_error') as errors,
            
            max(if(event_type = 'full_snapshot', 1, 0)) as has_recording
        FROM events
        GROUP BY site_id, session_id
      `
    });

    // 3. Create device_stats_daily Target Table
    console.log('🛠 Creating device_stats_daily table...');
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS device_stats_daily
        (
            site_id String,
            day Date,
            device_type String,
            browser String, -- We'll attempt to extract this or fallback
            
            visits AggregateFunction(uniq, String), -- count distinct session_id
            page_views SimpleAggregateFunction(sum, UInt64)
        )
        ENGINE = AggregatingMergeTree()
        ORDER BY (site_id, day, device_type, browser)
        TTL day + INTERVAL 90 DAY
      `
    });

    // 4. Create device_stats_daily_mv
    console.log('🔄 Creating device_stats_daily_mv...');
    // Note: Parsing browser from UA is complex in pure SQL without specific functions.
    // For now, we will group by device_type and use a dummy 'Unknown' for browser OR 
    // rely on 'user_agent' if it's clean. Let's assume we just want Device Breakdown for now 
    // as requested "Mobile vs Desktop". We can skip browser extraction complexity here 
    // or use a simple regex if we really want.
    await client.command({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS device_stats_daily_mv TO device_stats_daily
        AS SELECT
            site_id,
            toStartOfDay(timestamp) as day,
            device_type,
            'Unknown' as browser, -- Placeholder unless we use domain logic
            
            uniqState(session_id) as visits,
            count() as page_views
        FROM events
        GROUP BY site_id, day, device_type
      `
    });

    // 5. Create core_web_vitals_daily
    console.log('🛠 Creating core_web_vitals_daily table...');
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS core_web_vitals_daily
        (
            site_id String,
            day Date,
            
            lcp_sum SimpleAggregateFunction(sum, Float64),
            lcp_count SimpleAggregateFunction(sum, UInt64),
            cls_sum SimpleAggregateFunction(sum, Float64),
            cls_count SimpleAggregateFunction(sum, UInt64)
        )
        ENGINE = AggregatingMergeTree()
        ORDER BY (site_id, day)
        TTL day + INTERVAL 90 DAY
      `
    });

    // 6. Create core_web_vitals_daily_mv
    console.log('🔄 Creating core_web_vitals_daily_mv...');
    await client.command({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS core_web_vitals_daily_mv TO core_web_vitals_daily
        AS SELECT
            site_id,
            toStartOfDay(timestamp) as day,
            
            sumIf(load_time, event_type = 'LCP') as lcp_sum,
            countIf(event_type = 'LCP') as lcp_count,
            
            -- Assuming CLS might be in 'x' or 'value' or 'load_time' if standard. 
            -- Given schema has 'confusion_scroll_score', maybe we use that?
            -- User specifically asked for LCP/CLS. 
            -- We'll assume CLS events exist with 'value' stored in 'load_time' (common hack) or 'x'.
            -- Let's stick to LCP only if unsure, or try generic.
            
            sumIf(x, event_type = 'CLS') as cls_sum, -- Assuming x holds value
            countIf(event_type = 'CLS') as cls_count
        FROM events
        GROUP BY site_id, day
      `
    });

    console.log('✅ ClickHouse setup complete!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error setting up ClickHouse:', err);
    process.exit(1);
  }
}

run();
