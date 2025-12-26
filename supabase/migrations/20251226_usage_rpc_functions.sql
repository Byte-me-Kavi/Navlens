-- =====================================================
-- RPC Function: Get recordings count per site for current billing month
-- Purpose: Accurate COUNT DISTINCT of session_ids from rrweb_events
-- NOTE: site_id is stored as TEXT in rrweb_events, not UUID
-- =====================================================

-- Function to get recordings count for a specific site (current month)
CREATE OR REPLACE FUNCTION public.get_site_recordings_count(p_site_id TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT session_id)::INTEGER
  FROM public.rrweb_events
  WHERE site_id = p_site_id
    AND timestamp >= date_trunc('month', NOW());
$$;

-- Function to get recordings count for a site (all time - for reference)
CREATE OR REPLACE FUNCTION public.get_site_recordings_count_all(p_site_id TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT session_id)::INTEGER
  FROM public.rrweb_events
  WHERE site_id = p_site_id;
$$;

-- Function to get sessions count for a site (current month)
-- This counts from sessions_view which is built from rrweb_events
CREATE OR REPLACE FUNCTION public.get_site_sessions_count(p_site_id TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.sessions_view
  WHERE site_id = p_site_id
    AND started_at >= date_trunc('month', NOW());
$$;

-- Grant execute permission to authenticated and service roles
GRANT EXECUTE ON FUNCTION public.get_site_recordings_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_recordings_count(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_site_recordings_count_all(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_recordings_count_all(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_site_sessions_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_sessions_count(TEXT) TO service_role;

COMMENT ON FUNCTION public.get_site_recordings_count IS 'Returns count of unique session recordings for a site in current billing month';
COMMENT ON FUNCTION public.get_site_sessions_count IS 'Returns count of sessions for a site in current billing month';
