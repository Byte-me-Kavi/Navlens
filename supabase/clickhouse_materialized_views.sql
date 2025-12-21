-- =====================================================
-- CLICKHOUSE MATERIALIZED VIEWS FOR NAVLENS
-- Pre-calculated aggregation tables for faster queries
-- =====================================================

-- NOTE: User has already created these views in ClickHouse Cloud
-- This file serves as documentation and reference

-- =====================================================
-- 1. DASHBOARD STATS AGGREGATIONS (Hourly)
-- Pre-aggregates clicks, sessions per site per hour
-- Used by: /api/dashboard-stats
-- =====================================================
CREATE TABLE IF NOT EXISTS dashboard_stats_hourly (
    site_id String,
    hour DateTime,
    total_clicks UInt64,
    unique_sessions UInt64,
    unique_pages UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (site_id, hour);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats
TO dashboard_stats_hourly
AS SELECT
    site_id,
    toStartOfHour(timestamp) as hour,
    countIf(event_type = 'click') as total_clicks,
    uniq(session_id) as unique_sessions,
    uniq(page_path) as unique_pages
FROM events
GROUP BY site_id, toStartOfHour(timestamp);

-- =====================================================
-- 2. HEATMAP CLICKS AGGREGATION (Daily)
-- Pre-groups clicks by relative coordinates
-- Used by: /api/heatmap-clicks
-- =====================================================
CREATE TABLE IF NOT EXISTS heatmap_clicks_daily (
    site_id String,
    page_path String,
    device_type String,
    document_width UInt32,
    document_height UInt32,
    x_relative Float64,
    y_relative Float64,
    day Date,
    click_count UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (site_id, page_path, device_type, document_width, document_height, x_relative, y_relative, day);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_heatmap_clicks
TO heatmap_clicks_daily
AS SELECT
    site_id,
    page_path,
    device_type,
    document_width,
    document_height,
    x_relative,
    y_relative,
    toDate(timestamp) as day,
    count() as click_count
FROM events
WHERE event_type = 'click'
  AND x_relative > 0 AND y_relative > 0
GROUP BY site_id, page_path, device_type, document_width, document_height, 
         x_relative, y_relative, toDate(timestamp);

-- =====================================================
-- 3. SCROLL DEPTH AGGREGATIONS (Daily)
-- Pre-aggregates scroll metrics per page
-- Used by: /api/heatmap-scrolls
-- =====================================================
CREATE TABLE IF NOT EXISTS scroll_stats_daily (
    site_id String,
    page_path String,
    device_type String,
    day Date,
    max_scroll_depth Float64,
    avg_scroll_depth Float64,
    session_count UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (site_id, page_path, device_type, day);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_scroll_stats
TO scroll_stats_daily
AS SELECT
    site_id,
    page_path,
    device_type,
    toDate(timestamp) as day,
    max(scroll_depth) as max_scroll_depth,
    avg(scroll_depth) as avg_scroll_depth,
    uniq(session_id) as session_count
FROM events
WHERE event_type = 'scroll'
GROUP BY site_id, page_path, device_type, toDate(timestamp);

-- =====================================================
-- 4. SUBSCRIPTION USAGE (Monthly Billing)
-- Tracks unique pages with data per site per month
-- Used by: /api/subscription-usage
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_usage_monthly (
    site_id String,
    month Date,
    unique_pages UInt64,
    total_clicks UInt64,
    total_sessions UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY month
ORDER BY (site_id, month);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_subscription_usage
TO subscription_usage_monthly
AS SELECT
    site_id,
    toStartOfMonth(timestamp) as month,
    uniq(page_path) as unique_pages,
    countIf(event_type = 'click') as total_clicks,
    uniq(session_id) as total_sessions
FROM events
GROUP BY site_id, toStartOfMonth(timestamp);

-- =====================================================
-- 5. FRUSTRATION SIGNALS AGGREGATION (Hourly)
-- Pre-aggregates dead clicks, rage clicks, confusion scores
-- Used by: /api/frustration-signals, /api/frustration-hotspots
-- =====================================================
CREATE TABLE IF NOT EXISTS frustration_stats_hourly (
    site_id String,
    page_path String,
    hour DateTime,
    dead_clicks UInt64,
    rage_clicks UInt64,
    erratic_movements UInt64,
    avg_confusion_score Float64,
    total_events UInt64
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (site_id, page_path, hour);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_frustration_stats
TO frustration_stats_hourly
AS SELECT
    site_id,
    page_path,
    toStartOfHour(timestamp) as hour,
    countIf(is_dead_click = true) as dead_clicks,
    countIf(click_count >= 3) as rage_clicks,
    countIf(is_erratic_movement = true) as erratic_movements,
    avg(confusion_scroll_score) as avg_confusion_score,
    count() as total_events
FROM events
GROUP BY site_id, page_path, toStartOfHour(timestamp);

-- =====================================================
-- BACKFILL COMMANDS (Run once after MV creation)
-- These populate the tables with historical data
-- =====================================================

-- Backfill dashboard_stats_hourly
-- INSERT INTO dashboard_stats_hourly
-- SELECT site_id, toStartOfHour(timestamp), countIf(event_type = 'click'), uniq(session_id), uniq(page_path)
-- FROM events GROUP BY site_id, toStartOfHour(timestamp);

-- Backfill heatmap_clicks_daily
-- INSERT INTO heatmap_clicks_daily
-- SELECT site_id, page_path, device_type, document_width, document_height, x_relative, y_relative, toDate(timestamp), count()
-- FROM events WHERE event_type = 'click' AND x_relative > 0 AND y_relative > 0
-- GROUP BY site_id, page_path, device_type, document_width, document_height, x_relative, y_relative, toDate(timestamp);

-- =====================================================
-- SECONDARY INDICES (Optional Performance Boost)
-- =====================================================
-- ALTER TABLE events ADD INDEX idx_page_path page_path TYPE bloom_filter(0.01) GRANULARITY 1;
-- ALTER TABLE events ADD INDEX idx_device_type device_type TYPE set(3) GRANULARITY 1;
-- ALTER TABLE events ADD INDEX idx_session session_id TYPE bloom_filter(0.01) GRANULARITY 1;

-- =====================================================
-- DATA RETENTION (Recommended for production)
-- =====================================================
-- ALTER TABLE events MODIFY TTL timestamp + INTERVAL 90 DAY;
