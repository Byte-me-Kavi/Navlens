CREATE TABLE default.debug_events
(
    `site_id` String,
    `session_id` String,
    `event_id` String,
    `event_type` LowCardinality(String),
    `timestamp` DateTime64(3),
    `console_level` LowCardinality(String) DEFAULT '',
    `console_message` String DEFAULT '',
    `console_stack` String DEFAULT '',
    `network_method` LowCardinality(String) DEFAULT '',
    `network_url` String DEFAULT '',
    `network_status` Int16 DEFAULT 0,
    `network_duration_ms` Int32 DEFAULT 0,
    `network_type` LowCardinality(String) DEFAULT '',
    `network_initiator` String DEFAULT '',
    `request_size` Int32 DEFAULT 0,
    `response_size` Int32 DEFAULT 0,
    `vital_name` LowCardinality(String) DEFAULT '',
    `vital_value` Float64 DEFAULT 0,
    `vital_rating` LowCardinality(String) DEFAULT '',
    `vital_entries` String DEFAULT '',
    `page_url` String DEFAULT '',
    `page_path` String DEFAULT '',
    `created_at` DateTime DEFAULT now(),
    INDEX idx_session_type (session_id, event_type) TYPE bloom_filter GRANULARITY 1
)
ENGINE = SharedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, session_id, timestamp, event_id)
TTL timestamp + toIntervalDay(30)
SETTINGS index_granularity = 8192