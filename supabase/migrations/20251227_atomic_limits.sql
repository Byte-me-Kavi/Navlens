-- =====================================================
-- Atomic Limit Enforcement
-- Updates increment functions to accept a limit and Check-and-Update atomically
-- =====================================================

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
    -- This prevents concurrent reads getting the same "safe" value before update
    PERFORM 1 FROM public.user_usage_stats WHERE user_id = p_user_id FOR UPDATE;

    -- 2. Get current usage (if row exists)
    SELECT sessions_this_month INTO v_current_count 
    FROM public.user_usage_stats 
    WHERE user_id = p_user_id;

    v_current_count := COALESCE(v_current_count, 0);

    -- 3. Check Limit
    -- p_limit = -1 means unlimited
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
    -- Note: If inserting, we set recordings=1. sessions defaults to 0.
    INSERT INTO public.user_usage_stats (user_id, sessions_this_month, recordings_count)
    VALUES (p_user_id, 0, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        recordings_count = user_usage_stats.recordings_count + 1,
        updated_at = NOW();
END;
$$;
