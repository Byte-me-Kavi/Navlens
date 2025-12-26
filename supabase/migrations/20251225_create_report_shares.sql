-- Create table for storing shareable report links
CREATE TABLE IF NOT EXISTS public.report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL,
  days INTEGER DEFAULT 30,
  include TEXT DEFAULT 'all',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON public.report_shares(share_token);

-- Index for site-based queries
CREATE INDEX IF NOT EXISTS idx_report_shares_site_id ON public.report_shares(site_id);

-- Enable RLS
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shares for their sites
CREATE POLICY "Users can view report shares for their sites"
ON public.report_shares FOR SELECT
To authenticated
USING (
  site_id IN (
    SELECT id FROM sites WHERE user_id = auth.uid()
  )
);

-- Policy: Users can create shares for their sites
CREATE POLICY "Users can create report shares for their sites"
ON public.report_shares FOR INSERT
To authenticated
WITH CHECK (
  site_id IN (
    SELECT id FROM sites WHERE user_id = auth.uid()
  )
);

-- Policy: Users can delete their shares
CREATE POLICY "Users can delete their report shares"
ON public.report_shares FOR DELETE
To authenticated
USING (
  site_id IN (
    SELECT id FROM sites WHERE user_id = auth.uid()
  )
);

