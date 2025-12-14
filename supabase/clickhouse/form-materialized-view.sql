CREATE MATERIALIZED VIEW default.form_field_metrics
(
    `site_id` String,
    `form_id` String,
    `field_id` String,
    `field_name` String,
    `field_type` LowCardinality(String),
    `field_index` UInt8,
    `date` Date,
    `focus_count` UInt64,
    `blur_count` UInt64,
    `submit_count` UInt64,
    `abandon_count` UInt64,
    `refill_count` UInt64,
    `total_time_ms` UInt64,
    `interaction_count` UInt64
)
ENGINE = SharedSummingMergeTree('/clickhouse/tables/{uuid}/{shard}', '{replica}')
ORDER BY (site_id, form_id, field_id, date)
SETTINGS index_granularity = 8192
AS SELECT
    site_id,
    form_id,
    field_id,
    field_name,
    field_type,
    field_index,
    toDate(timestamp) AS date,
    countIf(interaction_type = 'focus') AS focus_count,
    countIf(interaction_type = 'blur') AS blur_count,
    countIf(interaction_type = 'submit') AS submit_count,
    countIf(interaction_type = 'abandon') AS abandon_count,
    countIf(was_refilled = true) AS refill_count,
    sum(time_spent_ms) AS total_time_ms,
    count() AS interaction_count
FROM default.form_interactions
GROUP BY
    site_id,
    form_id,
    field_id,
    field_name,
    field_type,
    field_index,
    date