-- =====================================================
-- CONFLICT CLEANUP: RPC Function Consolidation
-- Run this to ensure correct RPC signatures in the database
-- =====================================================

-- Drop any conflicting 1-param versions of increment functions
-- These may exist from earlier migrations
DROP FUNCTION IF EXISTS public.increment_session_count(UUID);
DROP FUNCTION IF EXISTS public.increment_recording_count(UUID);

-- Recreate the correct 2-param atomic versions with limit checking

-- Function to atomically increment session count with limit check
CREATE OR REPLACE FUNCTION public.increment_session_count(p_user_id UUID, p_limit INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count INT;
BEGIN
    -- 1. Attempt to lock the row for this user to serialize updates
    PERFORM 1 FROM public.user_usage_stats WHERE user_id = p_user_id FOR UPDATE;

    -- 2. Get current usage (if row exists)
    SELECT sessions_this_month INTO v_current_count 
    FROM public.user_usage_stats 
    WHERE user_id = p_user_id;

    v_current_count := COALESCE(v_current_count, 0);

    -- 3. Check Limit (-1 means unlimited)
    IF p_limit != -1 AND v_current_count >= p_limit THEN
        RAISE EXCEPTION 'Session limit reached: %/%', v_current_count, p_limit;
    END IF;

    -- 4. Upsert (Increment or Insert)
    INSERT INTO public.user_usage_stats (user_id, sessions_this_month, recordings_count)
    VALUES (p_user_id, 1, 0)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        sessions_this_month = user_usage_stats.sessions_this_month + 1,
        updated_at = NOW();
END;
$$;

-- Function to atomically increment recording count with limit check
CREATE OR REPLACE FUNCTION public.increment_recording_count(p_user_id UUID, p_limit INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_count INT;
BEGIN
    -- 1. Lock row
    PERFORM 1 FROM public.user_usage_stats WHERE user_id = p_user_id FOR UPDATE;

    -- 2. Get current usage
    SELECT recordings_count INTO v_current_count 
    FROM public.user_usage_stats 
    WHERE user_id = p_user_id;

    v_current_count := COALESCE(v_current_count, 0);

    -- 3. Check Limit
    IF p_limit != -1 AND v_current_count >= p_limit THEN
        RAISE EXCEPTION 'Recording limit reached: %/%', v_current_count, p_limit;
    END IF;

    -- 4. Upsert (Increment or Insert)
    INSERT INTO public.user_usage_stats (user_id, sessions_this_month, recordings_count)
    VALUES (p_user_id, 0, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        recordings_count = user_usage_stats.recordings_count + 1,
        updated_at = NOW();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_session_count(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_session_count(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_recording_count(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_recording_count(UUID, INTEGER) TO service_role;

-- Add comments
COMMENT ON FUNCTION public.increment_session_count(UUID, INTEGER) IS 'Atomically increments session count with limit enforcement';
COMMENT ON FUNCTION public.increment_recording_count(UUID, INTEGER) IS 'Atomically increments recording count with limit enforcement';

-- Verify - list current functions
-- Run this to confirm only 2-param versions exist:
-- SELECT proname, pg_get_function_arguments(oid) FROM pg_proc WHERE proname IN ('increment_session_count', 'increment_recording_count');
