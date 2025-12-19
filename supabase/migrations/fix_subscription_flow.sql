-- =====================================================
-- FIX: Subscription Flow & User Registration
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- 1. Ensure Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure Tables Exist (Safe Create)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  price_usd DECIMAL(10,2) NOT NULL,
  price_lkr DECIMAL(10,2) NOT NULL,
  session_limit INTEGER,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  payhere_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Ensure Columns Exist (Idempotent)
DO $$
BEGIN
    -- Add subscription_id to profiles if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_id') THEN
        ALTER TABLE profiles ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
    END IF;
END $$;

-- 4. Seed 'Free' Plan (Critical for Trigger)
INSERT INTO subscription_plans (name, price_usd, price_lkr, session_limit, features)
VALUES (
  'Free', 0.00, 0.00, 1000,
  '{"heatmaps": "limited", "heatmaps_per_day": 10}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- 5. Fix Trigger Function to Use 'Free' Plan
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
  new_subscription_id UUID;
BEGIN
  -- Get Free Plan ID
  SELECT id INTO free_plan_id FROM subscription_plans WHERE name = 'Free' LIMIT 1;

  -- Create Subscription (Defaults to Free)
  INSERT INTO subscriptions (user_id, plan_id, status, start_date)
  VALUES (NEW.id, free_plan_id, 'active', NOW())
  RETURNING id INTO new_subscription_id;

  -- Create Profile
  INSERT INTO profiles (user_id, subscription_id)
  VALUES (NEW.id, new_subscription_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Reset Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- 7. Fix RLS Policies (Allow Insert)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow Trigger/Service Role (Insert)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
CREATE POLICY "Enable insert for authenticated users only" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also allow service role full access
DROP POLICY IF EXISTS "Service role full access profiles" ON profiles;
CREATE POLICY "Service role full access profiles" ON profiles FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access subscriptions" ON subscriptions;
CREATE POLICY "Service role full access subscriptions" ON subscriptions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
