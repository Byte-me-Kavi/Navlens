CREATE TABLE default.form_interactions
(
    `site_id` String,
    `session_id` String,
    `form_id` String,
    `form_url` String,
    `field_id` String,
    `field_name` String,
    `field_type` LowCardinality(String),
    `field_index` UInt8,
    `interaction_type` Enum8('focus' = 1, 'blur' = 2, 'change' = 3, 'submit' = 4, 'abandon' = 5),
    `focus_time` DateTime64(3),
    `blur_time` DateTime64(3),
    `time_spent_ms` UInt32 DEFAULT 0,
    `change_count` UInt8 DEFAULT 0,
    `was_refilled` Bool DEFAULT false,
    `field_had_value` Bool DEFAULT false,
    `was_submitted` Bool DEFAULT false,
    `timestamp` DateTime64(3),
    `created_at` DateTime DEFAULT now(),
    INDEX idx_session session_id TYPE bloom_filter GRANULARITY 1
)
ENGINE = SharedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
PARTITION BY toYYYYMM(timestamp)
ORDER BY (site_id, form_id, field_index, timestamp)
TTL timestamp + toIntervalDay(90)
SETTINGS index_granularity = 8192