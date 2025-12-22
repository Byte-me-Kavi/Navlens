-- =============================================================================
-- ADD TRACKING TOGGLE FIELD TO SITES TABLE
-- =============================================================================
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Add is_tracking_enabled column to sites table
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS is_tracking_enabled BOOLEAN DEFAULT true;

-- Add a comment for documentation
COMMENT ON COLUMN sites.is_tracking_enabled IS 'Whether tracking is enabled for this site. When false, the tracker script will not collect events.';

-- Create an index for efficient filtering (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_sites_tracking_enabled ON sites(is_tracking_enabled);
