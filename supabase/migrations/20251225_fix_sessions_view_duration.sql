-- Fix sessions_view to calculate duration from rrweb event timestamps
-- The issue: previous view used the database `timestamp` column (batch insert time)
-- The fix: extract timestamps from the JSONB events array to get actual session duration

CREATE OR REPLACE VIEW public.sessions_view AS
WITH event_timestamps AS (
    -- Extract min and max timestamps from the JSONB events array for each session
    SELECT 
        session_id,
        site_id,
        MIN((elem->>'timestamp')::bigint) as min_event_ts,
        MAX((elem->>'timestamp')::bigint) as max_event_ts
    FROM rrweb_events,
    LATERAL jsonb_array_elements(events) as elem
    GROUP BY session_id, site_id
)
SELECT
    r.session_id,
    r.site_id,
    min(r.visitor_id) as visitor_id,
    min(r.timestamp) as started_at,
    max(r.timestamp) as ended_at,
    -- Use actual rrweb event timestamps (in milliseconds) to calculate duration in seconds
    COALESCE(
        ((et.max_event_ts - et.min_event_ts) / 1000)::integer,
        0
    ) as duration,
    count(distinct r.page_path) as page_views,
    array_agg(distinct r.page_path) as pages,
    min(r.country) as country,
    min(r.ip_address) as ip_address,
    min(r.device_type) as device_type,
    min(r.platform) as platform,
    min(r.user_agent) as user_agent,
    min(r.screen_width) as screen_width,
    min(r.screen_height) as screen_height,
    -- Aggregate session signals
    (
        SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
        FROM (
            SELECT jsonb_array_elements(sigs) as elem
            FROM unnest(array_agg(r.session_signals)) as sigs
        ) s
    ) as signals
FROM
    rrweb_events r
LEFT JOIN event_timestamps et ON r.session_id = et.session_id AND r.site_id = et.site_id
GROUP BY
    r.session_id,
    r.site_id,
    et.min_event_ts,
    et.max_event_ts;
