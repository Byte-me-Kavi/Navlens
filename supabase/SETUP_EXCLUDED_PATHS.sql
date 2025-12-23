-- Execute this SQL in Supabase SQL Editor to create the excluded_paths table

CREATE TABLE IF NOT EXISTS public.excluded_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  excluded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id, page_path)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_excluded_paths_site_id ON public.excluded_paths(site_id);

-- IMPORTANT: Disable RLS to allow the backend service role to insert/query without user context
ALTER TABLE public.excluded_paths DISABLE ROW LEVEL SECURITY;

-- Verify table was created
SELECT 'excluded_paths table created successfully!' as status;
