-- =====================================================
-- Create user_usage_stats table for tracking monthly usage
-- Purpose: Track sessions and recordings count per user for limit enforcement
-- =====================================================

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS public.user_usage_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    sessions_this_month INT DEFAULT 0,
    recordings_count INT DEFAULT 0,
    period_start TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_user_id ON public.user_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_period_start ON public.user_usage_stats(period_start);

-- Add comments
COMMENT ON TABLE public.user_usage_stats IS 'Tracks monthly session and recording usage per user for subscription limit enforcement';
COMMENT ON COLUMN public.user_usage_stats.sessions_this_month IS 'Count of sessions started this month';
COMMENT ON COLUMN public.user_usage_stats.recordings_count IS 'Total count of session recordings';
COMMENT ON COLUMN public.user_usage_stats.period_start IS 'Start of the current tracking period (resets monthly)';

-- Enable RLS
ALTER TABLE public.user_usage_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own usage stats
CREATE POLICY "Users can view own usage stats"
    ON public.user_usage_stats
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service role can manage all usage stats
CREATE POLICY "Service role can manage usage stats"
    ON public.user_usage_stats
    FOR ALL
    USING (auth.role() = 'service_role');

-- Function to atomically increment session count
CREATE OR REPLACE FUNCTION public.increment_session_count(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_usage_stats (user_id, sessions_this_month, recordings_count)
    VALUES (user_id, 1, 0)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        sessions_this_month = user_usage_stats.sessions_this_month + 1,
        updated_at = NOW();
END;
$$;

COMMENT ON FUNCTION public.increment_session_count IS 'Atomically increments session count for a user';

