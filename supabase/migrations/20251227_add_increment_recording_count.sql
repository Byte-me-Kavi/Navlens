CREATE OR REPLACE FUNCTION increment_recording_count(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_usage_stats
  SET recordings_count = recordings_count + 1,
      updated_at = NOW()
  WHERE user_usage_stats.user_id = increment_recording_count.user_id;
END;
$$;
