-- =====================================================
-- FINAL FIX: Subscriptions & User Signup Trigger
-- Run in Supabase SQL Editor
-- =====================================================

-- 1. Ensure Free Plan Exists (Idempotent)
INSERT INTO public.subscription_plans (name, price_usd, price_lkr, session_limit, features)
VALUES (
  'Free', 0.00, 0.00, 1000, 
  '{"heatmaps": "limited", "heatmaps_per_day": 10}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- 2. Update Trigger Function (CRITICAL: Set search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public -- Fixes visibility issues
AS $$
DECLARE
  free_plan_id uuid;
  new_subscription_id uuid;
BEGIN
  -- Search for Free plan
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'Free' LIMIT 1;

  -- Safety check: If Free plan missing, create it on the fly or raise clear error
  IF free_plan_id IS NULL THEN
    -- Emergency fallback if seed failed
    INSERT INTO public.subscription_plans (name, price_usd, price_lkr, features)
    VALUES ('Free', 0, 0, '{}'::jsonb)
    RETURNING id INTO free_plan_id;
  END IF;

  -- Create Subscription
  INSERT INTO public.subscriptions (user_id, plan_id, status, start_date)
  VALUES (NEW.id, free_plan_id, 'active', NOW())
  RETURNING id INTO new_subscription_id;

  -- Create Profile
  INSERT INTO public.profiles (user_id, subscription_id, full_name)
  VALUES (
    NEW.id, 
    new_subscription_id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Reset Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS Policy Cleanup (Ensure Insert is allowed for Trigger)
-- Because Trigger is SECURITY DEFINER, it bypasses RLS, but we ensure policies don't conflict
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop potentially blocking policies logic if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.subscriptions;

-- Ensure Service Role has full access (Backup)
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
CREATE POLICY "Service role full access profiles" ON public.profiles FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access subscriptions" ON public.subscriptions;
CREATE POLICY "Service role full access subscriptions" ON public.subscriptions FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add simple read policies for users if missing
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
