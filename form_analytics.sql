-- Form Analytics Database Schema
-- Track field-level form interactions: drop-off, time-to-fill, refill rates
-- Run this in your ClickHouse database

-- Main interactions table
CREATE TABLE IF NOT EXISTS default.form_interactions (
    site_id String,
    session_id String,
    form_id String,          -- Form identifier (id/name/selector)
    form_url String,         -- Page URL where form exists
    field_id String,         -- Field identifier
    field_name String,       -- Field name attribute
    field_type LowCardinality(String),  -- input type: text, email, password, etc.
    field_index UInt8,       -- Field order in form (1-indexed)
    
    -- Interaction type
    interaction_type Enum8('focus' = 1, 'blur' = 2, 'change' = 3, 'submit' = 4, 'abandon' = 5),
    
    -- Time metrics
    focus_time DateTime64(3),
    blur_time DateTime64(3),
    time_spent_ms UInt32 DEFAULT 0,
    
    -- Refill detection
    change_count UInt8 DEFAULT 0,
    was_refilled Bool DEFAULT false,
    
    -- Context
    field_had_value Bool DEFAULT false,
    was_submitted Bool DEFAULT false,
    
    -- Metadata
    timestamp DateTime64(3),
    created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, form_id, field_index, timestamp)
TTL timestamp + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- Index for session lookups
ALTER TABLE default.form_interactions ADD INDEX idx_session (session_id) TYPE bloom_filter GRANULARITY 1;

-- Materialized View for pre-aggregated metrics (fast dashboard queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS default.form_field_metrics
ENGINE = SummingMergeTree()
ORDER BY (site_id, form_id, field_id, date)
AS SELECT
    site_id,
    form_id,
    field_id,
    field_name,
    field_type,
    field_index,
    toDate(timestamp) as date,
    
    -- Interaction counts
    countIf(interaction_type = 'focus') as focus_count,
    countIf(interaction_type = 'blur') as blur_count,
    countIf(interaction_type = 'submit') as submit_count,
    countIf(interaction_type = 'abandon') as abandon_count,
    countIf(was_refilled = true) as refill_count,
    
    -- Time metrics (sum for later averaging)
    sum(time_spent_ms) as total_time_ms,
    count() as interaction_count
    
FROM form_interactions
GROUP BY site_id, form_id, field_id, field_name, field_type, field_index, date;

-- Comments:
-- form_interactions: Raw event data with 90-day TTL
-- form_field_metrics: Daily aggregates for fast dashboard queries
-- Use focus_count as "started" and blur_count as "completed" for drop-off calculation
