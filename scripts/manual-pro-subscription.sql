-- =====================================================
-- Manual Pro Subscription Assignment
-- =====================================================
-- This script will manually assign a Pro subscription to your account
-- Run this in your Supabase SQL Editor

-- Step 1: Get your user ID (you'll need to replace YOUR_EMAIL with your actual email)
-- Uncomment and run this first to get your user_id:
-- SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL';

-- Step 2: Get the Pro plan ID
-- Copy this ID for the next step
SELECT id, name, price_usd FROM subscription_plans WHERE name = 'Pro';

-- Step 3: Insert a Pro subscription for your user
-- Replace 'YOUR_USER_ID_HERE' with the user ID from Step 1
-- Replace 'PRO_PLAN_ID_HERE' with the plan ID from Step 2
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
  'YOUR_USER_ID_HERE',  -- Replace with your user ID
  'PRO_PLAN_ID_HERE',   -- Replace with Pro plan ID
  'manual-pro-' || gen_random_uuid()::text,  -- Generate a unique subscription ID
  'active',
  NOW(),
  NOW(),
  NOW() + INTERVAL '1 month',  -- Pro subscription valid for 1 month
  false
)
ON CONFLICT DO NOTHING;

-- Step 4: Update your profile to link to the new subscription
-- Replace 'YOUR_USER_ID_HERE' with your user ID
UPDATE profiles
SET subscription_id = (
  SELECT id FROM subscriptions 
  WHERE user_id = 'YOUR_USER_ID_HERE' 
  AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1
)
WHERE user_id = 'YOUR_USER_ID_HERE';

-- Step 5: Verify the subscription was created
-- Replace 'YOUR_USER_ID_HERE' with your user ID
SELECT 
  s.id,
  s.user_id,
  sp.name as plan_name,
  s.status,
  s.start_date,
  s.current_period_end
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.user_id = 'YOUR_USER_ID_HERE';
