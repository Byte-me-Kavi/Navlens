-- =====================================================
-- Add 'limits' column to subscription_plans
-- Purpose: Centralize subscription limits in the database
-- =====================================================

-- 1. Add limits column if it doesn't exist
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}'::jsonb;

-- 2. Populate limits for each plan
-- Free Plan
UPDATE public.subscription_plans
SET limits = '{
    "sessions": 500,
    "recordings": 50,
    "retention_days": 3,
    "active_experiments": 0,
    "active_surveys": 0,
    "heatmap_pages": 3,
    "max_sites": 1
}'::jsonb
WHERE name = 'Free';

-- Starter Plan
UPDATE public.subscription_plans
SET limits = '{
    "sessions": 5000,
    "recordings": 1000,
    "retention_days": 30,
    "active_experiments": 1,
    "active_surveys": 1,
    "heatmap_pages": 8,
    "max_sites": 3
}'::jsonb
WHERE name = 'Starter';

-- Pro Plan
UPDATE public.subscription_plans
SET limits = '{
    "sessions": 25000,
    "recordings": 5000,
    "retention_days": 90,
    "active_experiments": -1,
    "active_surveys": -1,
    "heatmap_pages": 15,
    "max_sites": 5
}'::jsonb
WHERE name = 'Pro';

-- Enterprise Plan
UPDATE public.subscription_plans
SET limits = '{
    "sessions": 150000,
    "recordings": 25000,
    "retention_days": 365,
    "active_experiments": -1,
    "active_surveys": -1,
    "heatmap_pages": -1,
    "max_sites": -1
}'::jsonb
WHERE name = 'Enterprise';

-- 3. Update comments
COMMENT ON COLUMN public.subscription_plans.limits IS 'JSON object containing specific numeric limits (e.g., max_sites, heatmap_pages)';
