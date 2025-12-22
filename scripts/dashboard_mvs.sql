-- =============================================================================
-- NAVLENS DASHBOARD MATERIALIZED VIEWS
-- =============================================================================
-- Run these commands in your ClickHouse console to create optimized MVs
-- for the dashboard widgets.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SESSION ANALYTICS (For Recent Sessions Feed)
-- Aggregates session-level metrics for quick retrieval
-- -----------------------------------------------------------------------------

-- Drop existing MV and table if they exist (to update schema)
DROP VIEW IF EXISTS session_analytics_mv;
DROP TABLE IF EXISTS session_analytics;

-- Target Table
CREATE TABLE IF NOT EXISTS session_analytics
(
    site_id String,
    session_id String,
    start_time SimpleAggregateFunction(min, DateTime),
    end_time SimpleAggregateFunction(max, DateTime),
    device_type SimpleAggregateFunction(any, String),
    
    event_count SimpleAggregateFunction(sum, UInt64),
    rage_clicks SimpleAggregateFunction(sum, UInt64),
    dead_clicks SimpleAggregateFunction(sum, UInt64),
    
    has_recording SimpleAggregateFunction(max, UInt8)
)
ENGINE = AggregatingMergeTree()
ORDER BY (site_id, session_id)
TTL start_time + INTERVAL 30 DAY;

-- Materialized View (Populates from events)
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
    
    max(if(event_type = 'full_snapshot', 1, 0)) as has_recording
FROM events
GROUP BY site_id, session_id;


-- -----------------------------------------------------------------------------
-- 2. FRUSTRATION STATS HOURLY (For Frustration Alert Widget)
-- Aggregates rage clicks and dead clicks by hour
-- -----------------------------------------------------------------------------

-- Drop existing MV and table if they exist (to update schema)
DROP VIEW IF EXISTS frustration_stats_hourly_mv;
DROP TABLE IF EXISTS frustration_stats_hourly;

-- Target Table
CREATE TABLE IF NOT EXISTS frustration_stats_hourly
(
    site_id String,
    hour DateTime,
    
    rage_clicks SimpleAggregateFunction(sum, UInt64),
    dead_clicks SimpleAggregateFunction(sum, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (site_id, hour)
TTL hour + INTERVAL 90 DAY;

-- Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS frustration_stats_hourly_mv TO frustration_stats_hourly
AS SELECT
    site_id,
    toStartOfHour(timestamp) as hour,
    
    countIf(event_type = 'rage_click') as rage_clicks,
    countIf(is_dead_click) as dead_clicks
FROM events
GROUP BY site_id, hour;


-- -----------------------------------------------------------------------------
-- 3. DEVICE STATS DAILY (For Device Split Widget)
-- Aggregates device type breakdown by day
-- -----------------------------------------------------------------------------

-- Drop existing MV and table if they exist (to update schema)
DROP VIEW IF EXISTS device_stats_daily_mv;
DROP TABLE IF EXISTS device_stats_daily;

-- Target Table
CREATE TABLE IF NOT EXISTS device_stats_daily
(
    site_id String,
    day Date,
    device_type String,
    
    unique_sessions AggregateFunction(uniq, String),
    page_views SimpleAggregateFunction(sum, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (site_id, day, device_type)
TTL day + INTERVAL 90 DAY;

-- Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS device_stats_daily_mv TO device_stats_daily
AS SELECT
    site_id,
    toStartOfDay(timestamp) as day,
    device_type,
    
    uniqState(session_id) as unique_sessions,
    count() as page_views
FROM events
GROUP BY site_id, day, device_type;


-- -----------------------------------------------------------------------------
-- 4. LIVE USERS (No MV needed - always real-time from events table)
-- Query: SELECT uniq(session_id) FROM events WHERE timestamp >= now() - INTERVAL 5 MINUTE
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 5. RECENT SESSIONS QUERY (Uses session_analytics table)
-- Query after MV is populated:
-- SELECT 
--     session_id,
--     device_type as device,
--     start_time,
--     end_time,
--     rage_clicks as rage_count,
--     event_count
-- FROM session_analytics
-- WHERE site_id IN (...)
--     AND end_time >= now() - INTERVAL 24 HOUR
-- ORDER BY end_time DESC
-- LIMIT 3
-- -----------------------------------------------------------------------------


-- =============================================================================
-- BACKFILL EXISTING DATA (Run ONCE after creating tables)
-- =============================================================================
-- If you have existing data in the events table, you need to backfill the MVs.
-- WARNING: This can be slow for large datasets. Run during off-peak hours.
-- =============================================================================

-- Backfill session_analytics
INSERT INTO session_analytics
SELECT
    site_id,
    session_id,
    min(timestamp) as start_time,
    max(timestamp) as end_time,
    any(device_type) as device_type,
    count() as event_count,
    countIf(event_type = 'rage_click') as rage_clicks,
    countIf(is_dead_click) as dead_clicks,
    max(if(event_type = 'full_snapshot', 1, 0)) as has_recording
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
GROUP BY site_id, session_id;

-- Backfill frustration_stats_hourly
INSERT INTO frustration_stats_hourly
SELECT
    site_id,
    toStartOfHour(timestamp) as hour,
    countIf(event_type = 'rage_click') as rage_clicks,
    countIf(is_dead_click) as dead_clicks
FROM events
WHERE timestamp >= now() - INTERVAL 90 DAY
GROUP BY site_id, hour;

-- Backfill device_stats_daily
INSERT INTO device_stats_daily
SELECT
    site_id,
    toStartOfDay(timestamp) as day,
    device_type,
    uniqState(session_id) as unique_sessions,
    count() as page_views
FROM events
WHERE timestamp >= now() - INTERVAL 90 DAY
GROUP BY site_id, day, device_type;
