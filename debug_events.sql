-- Developer Tools Debug Events Table
-- Stores console logs, network requests, and web vitals for session replay debugging
-- Run this in your ClickHouse database to create the table

CREATE TABLE IF NOT EXISTS default.debug_events (
    -- Identifiers
    site_id String,
    session_id String,
    event_id String,
    
    -- Event type: 'console', 'network', 'web_vital'
    event_type LowCardinality(String),
    
    -- High precision timestamp for timeline sync with session replay
    timestamp DateTime64(3),
    
    -- Console log fields
    console_level LowCardinality(String) DEFAULT '',  -- log, warn, error, info, debug
    console_message String DEFAULT '',
    console_stack String DEFAULT '',  -- Stack trace for errors
    
    -- Network request fields
    network_method LowCardinality(String) DEFAULT '',  -- GET, POST, PUT, DELETE, etc.
    network_url String DEFAULT '',
    network_status Int16 DEFAULT 0,  -- HTTP status code
    network_duration_ms Int32 DEFAULT 0,  -- Request duration in milliseconds
    network_type LowCardinality(String) DEFAULT '',  -- 'fetch' or 'xhr'
    network_initiator String DEFAULT '',  -- Source of the request
    request_size Int32 DEFAULT 0,
    response_size Int32 DEFAULT 0,
    
    -- Web Vitals fields
    vital_name LowCardinality(String) DEFAULT '',  -- LCP, CLS, INP, FCP, TTFB
    vital_value Float64 DEFAULT 0,
    vital_rating LowCardinality(String) DEFAULT '',  -- good, needs-improvement, poor
    vital_entries String DEFAULT '',  -- JSON string of attribution data
    
    -- Context
    page_url String DEFAULT '',
    page_path String DEFAULT '',
    
    -- Metadata
    created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, session_id, timestamp, event_id)
TTL timestamp + INTERVAL 30 DAY
SETTINGS index_granularity = 8192;

-- Index for faster session lookups
ALTER TABLE default.debug_events ADD INDEX idx_session_type (session_id, event_type) TYPE bloom_filter GRANULARITY 1;

-- Comment: This table has a 30-day TTL for automatic data cleanup
-- Debug events are partitioned by month for efficient querying
