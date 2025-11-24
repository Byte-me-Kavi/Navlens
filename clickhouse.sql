CREATE TABLE default.events
(
    `site_id` String,
    `event_type` String,
    `timestamp` DateTime,
    `x` Float64,
    `y` Float64,
    `x_relative` Float64,
    `y_relative` Float64,
    `scroll_depth` Float64,
    `page_url` String,
    `page_path` String,
    `referrer` String,
    `user_agent` String,
    `user_language` String,
    `viewport_width` Int32,
    `viewport_height` Int32,
    `screen_width` Int32,
    `screen_height` Int32,
    `device_type` String,
    `element_id` String,
    `element_classes` String,
    `element_tag` String,
    `element_text` String,
    `element_selector` String,
    `session_id` String,
    `client_id` String,
    `load_time` Float64,
    `variant_id` String,
    `document_width` Int32 DEFAULT 0,
    `document_height` Int32 DEFAULT 0
)
ENGINE = SharedMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
PRIMARY KEY (site_id, session_id, event_type, timestamp)
ORDER BY (site_id, session_id, event_type, timestamp)
SETTINGS index_granularity = 8192