CREATE TABLE IF NOT EXISTS api_metrics (
    timestamp DateTime DEFAULT now(),
    path String,
    method String,
    status_code UInt16,
    duration_ms UInt16,
    ip IPv4,
    user_agent String,
    site_id String DEFAULT ''
) ENGINE = MergeTree()
ORDER BY (timestamp, path);
