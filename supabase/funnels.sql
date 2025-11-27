-- ============================================
-- Funnels Table Schema for Supabase
-- ============================================
-- This creates the funnels table to store conversion funnel configurations.
-- Each funnel belongs to a site and contains multiple steps.

-- Create the funnels table
CREATE TABLE IF NOT EXISTS public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_funnels_site_id ON public.funnels(site_id);
CREATE INDEX IF NOT EXISTS idx_funnels_is_active ON public.funnels(is_active);
CREATE INDEX IF NOT EXISTS idx_funnels_created_at ON public.funnels(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.funnels IS 'Stores conversion funnel configurations for tracking user journeys';
COMMENT ON COLUMN public.funnels.id IS 'Unique identifier for the funnel';
COMMENT ON COLUMN public.funnels.site_id IS 'Reference to the site this funnel belongs to';
COMMENT ON COLUMN public.funnels.name IS 'Display name of the funnel';
COMMENT ON COLUMN public.funnels.description IS 'Optional description of what the funnel tracks';
COMMENT ON COLUMN public.funnels.steps IS 'JSON array of funnel steps with name, page_path, and conditions';
COMMENT ON COLUMN public.funnels.is_active IS 'Whether the funnel is actively being tracked';
COMMENT ON COLUMN public.funnels.created_at IS 'Timestamp when the funnel was created';
COMMENT ON COLUMN public.funnels.updated_at IS 'Timestamp when the funnel was last updated';

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see funnels for sites they own
CREATE POLICY "Users can view their own funnels" ON public.funnels
  FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM public.sites WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert funnels for sites they own
CREATE POLICY "Users can create funnels for their sites" ON public.funnels
  FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT id FROM public.sites WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own funnels
CREATE POLICY "Users can update their own funnels" ON public.funnels
  FOR UPDATE
  USING (
    site_id IN (
      SELECT id FROM public.sites WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT id FROM public.sites WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete their own funnels
CREATE POLICY "Users can delete their own funnels" ON public.funnels
  FOR DELETE
  USING (
    site_id IN (
      SELECT id FROM public.sites WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Trigger for updated_at timestamp
-- ============================================

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_funnels_updated_at
  BEFORE UPDATE ON public.funnels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Example: Steps JSON Structure
-- ============================================
-- The 'steps' column stores an array of step objects:
-- [
--   {
--     "id": "uuid",
--     "name": "Landing Page",
--     "page_path": "/",
--     "order_index": 0,
--     "conditions": [
--       { "type": "contains", "value": "utm_source" }
--     ]
--   },
--   {
--     "id": "uuid",
--     "name": "Pricing Page", 
--     "page_path": "/pricing",
--     "order_index": 1,
--     "conditions": []
--   },
--   {
--     "id": "uuid",
--     "name": "Checkout",
--     "page_path": "/checkout",
--     "order_index": 2,
--     "conditions": []
--   }
-- ]

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================
-- Uncomment to insert sample data:
-- INSERT INTO public.funnels (site_id, name, description, steps)
-- VALUES (
--   'YOUR_SITE_UUID_HERE',
--   'Signup Funnel',
--   'Tracks users from landing to signup completion',
--   '[
--     {"id": "step-1", "name": "Landing Page", "page_path": "/", "order_index": 0, "conditions": []},
--     {"id": "step-2", "name": "Features", "page_path": "/features", "order_index": 1, "conditions": []},
--     {"id": "step-3", "name": "Pricing", "page_path": "/pricing", "order_index": 2, "conditions": []},
--     {"id": "step-4", "name": "Signup", "page_path": "/signup", "order_index": 3, "conditions": []}
--   ]'::jsonb
-- );
