-- =====================================================
-- Drop Profiles Table Migration
-- Removes the deprecated profiles table and updates trigger
-- =====================================================

-- 1. Update handle_new_user trigger to NOT insert into profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  -- Search for Free plan
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'Free' LIMIT 1;

  -- Safety check: If Free plan missing, create it
  IF free_plan_id IS NULL THEN
    INSERT INTO public.subscription_plans (name, price_usd, price_lkr, features)
    VALUES ('Free', 0, 0, '{}'::jsonb)
    RETURNING id INTO free_plan_id;
  END IF;

  -- Create Subscription with 15-day Trial Expiration (NO profiles insert)
  INSERT INTO public.subscriptions (
      user_id, 
      plan_id, 
      status, 
      start_date, 
      current_period_start, 
      current_period_end
  )
  VALUES (
      NEW.id, 
      free_plan_id, 
      'active', 
      NOW(), 
      NOW(), 
      NOW() + interval '15 days'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop the deprecated profiles table (CASCADE removes policies/triggers)
DROP TABLE IF EXISTS public.profiles CASCADE;
