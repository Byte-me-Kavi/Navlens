CREATE TABLE default.custom_events
(
    `site_id` String,
    `session_id` String,
    `event_name` String,
    `properties` String,
    `timestamp` DateTime,
    `page_url` String,
    `page_path` String,
    `device_type` String
)
ENGINE = SharedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
ORDER BY (site_id, event_name, timestamp)
SETTINGS index_granularity = 8192