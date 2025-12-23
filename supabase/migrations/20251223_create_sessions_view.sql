-- Create a view to aggregate sessions from raw events
-- This solves the 1000-row limit issue in Supabase JS client and simplifies pagination

CREATE OR REPLACE VIEW public.sessions_view AS
SELECT
    session_id,
    site_id,
    min(visitor_id) as visitor_id,
    min(timestamp) as started_at,
    max(timestamp) as ended_at,
    (EXTRACT(EPOCH FROM max(timestamp)) - EXTRACT(EPOCH FROM min(timestamp)))::integer as duration,
    count(distinct page_path) as page_views,
    array_agg(distinct page_path) as pages,
    min(country) as country,
    min(ip_address) as ip_address,
    min(device_type) as device_type,
    min(platform) as platform, -- OS
    min(user_agent) as user_agent,
    min(screen_width) as screen_width,
    min(screen_height) as screen_height,
    -- Aggregate session signals (merging non-null arrays)
    -- This assumes session_signals is a JSONB array column
    (
        SELECT coalesce(jsonb_agg(elem), '[]'::jsonb)
        FROM (
            SELECT jsonb_array_elements(sigs) as elem
            FROM unnest(array_agg(session_signals)) as sigs
        ) s
    ) as signals
FROM
    rrweb_events
GROUP BY
    session_id,
    site_id;
