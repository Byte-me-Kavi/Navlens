-- =====================================================
-- Quick Pro Subscription Assignment (One-Step)
-- =====================================================
-- Instructions:
-- 1. Open your Supabase Dashboard > SQL Editor
-- 2. Replace 'your.email@example.com' with your actual email
-- 3. Run this entire script
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID;
  v_subscription_id UUID;
BEGIN
  -- Get user ID by email (CHANGE THIS EMAIL!)
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'kaveeshatmdss@gmail.com'  -- <--- CHANGE THIS!
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with that email';
  END IF;

  -- Get Pro plan ID
  SELECT id INTO v_plan_id 
  FROM subscription_plans 
  WHERE name = 'Pro'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Pro plan not found';
  END IF;

  -- Deactivate any existing subscriptions
  UPDATE subscriptions
  SET status = 'cancelled',
      cancel_at_period_end = true
  WHERE user_id = v_user_id
  AND status = 'active';

  -- Create new Pro subscription
  INSERT INTO subscriptions (
    user_id,
    plan_id,
    payhere_subscription_id,
    status,
    start_date,
    current_period_start,
    current_period_end,
    cancel_at_period_end
  ) VALUES (
    v_user_id,
    v_plan_id,
    'manual-pro-' || gen_random_uuid()::text,
    'active',
    NOW(),
    NOW(),
    NOW() + INTERVAL '1 year',  -- Valid for 1 year
    false
  )
  RETURNING id INTO v_subscription_id;

  -- Update profile with new subscription
  UPDATE profiles
  SET subscription_id = v_subscription_id,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Show success message
  RAISE NOTICE 'Success! Pro subscription created for user: %', v_user_id;
  RAISE NOTICE 'Subscription ID: %', v_subscription_id;
  RAISE NOTICE 'Valid until: %', NOW() + INTERVAL '1 year';
END $$;

-- Verify the subscription (optional check)
SELECT 
  u.email,
  sp.name as plan_name,
  s.status,
  s.start_date,
  s.current_period_end,
  s.payhere_subscription_id
FROM auth.users u
JOIN subscriptions s ON u.id = s.user_id
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC
LIMIT 1;
