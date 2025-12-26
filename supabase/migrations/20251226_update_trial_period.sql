-- =====================================================
-- Update Trial Period to 15 Days
-- Run this in Supabase SQL Editor
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  free_plan_id uuid;
  new_subscription_id uuid;
BEGIN
  -- Search for Free plan
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'Free' LIMIT 1;

  -- Safety check: If Free plan missing, create it
  IF free_plan_id IS NULL THEN
    INSERT INTO public.subscription_plans (name, price_usd, price_lkr, features)
    VALUES ('Free', 0, 0, '{}'::jsonb)
    RETURNING id INTO free_plan_id;
  END IF;

  -- Create Subscription with 15-day Trial Expiration
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
      NOW() + interval '15 days' -- 15 Day Trial Period
  )
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
