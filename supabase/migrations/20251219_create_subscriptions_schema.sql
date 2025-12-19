-- =====================================================
-- Navlens Subscription Schema Migration
-- Created: 2025-12-19
-- Purpose: PayHere subscription integration with 4-tier pricing
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Subscription Plans Table
-- =====================================================
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  price_usd DECIMAL(10,2) NOT NULL,
  price_lkr DECIMAL(10,2) NOT NULL,
  session_limit INTEGER, -- NULL = unlimited
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- User Subscriptions Table
-- =====================================================
CREATE TABLE subscriptions (
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

-- =====================================================
-- Profiles Table (extends auth.users)
-- NEVER modify auth.users - use this pattern instead
-- =====================================================
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key constraint after subscriptions table exists
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_subscription
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id);

-- =====================================================
-- Payment History Table
-- =====================================================
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  payhere_payment_id TEXT,
  payhere_order_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_date TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Usage Tracking Table
-- =====================================================
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID,
  month TEXT NOT NULL,
  sessions_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, site_id, month)
);

-- =====================================================
-- Auto-create Profile on User Signup (Trigger)
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- Atomic Usage Increment Function
-- =====================================================
CREATE OR REPLACE FUNCTION increment_session_usage(
  p_user_id UUID,
  p_site_id UUID,
  p_month TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, site_id, month, sessions_count, updated_at)
  VALUES (p_user_id, p_site_id, p_month, 1, NOW())
  ON CONFLICT (user_id, site_id, month)
  DO UPDATE SET
    sessions_count = usage_tracking.sessions_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX idx_profiles_subscription_id ON profiles(subscription_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_payhere_id ON subscriptions(payhere_subscription_id);
CREATE INDEX idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_usage_tracking_user_month ON usage_tracking(user_id, month);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only view/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Subscriptions: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Payment History: Users can view their own payment history
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

-- Usage Tracking: Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (for backend operations)
CREATE POLICY "Service role has full access to profiles"
  ON profiles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to subscriptions"
  ON subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to payment_history"
  ON payment_history FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role has full access to usage_tracking"
  ON usage_tracking FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- Seed Subscription Plans
-- =====================================================
INSERT INTO subscription_plans (name, price_usd, price_lkr, session_limit, features) VALUES
-- Free Tier: The Hook
(
  'Free',
  0.00,
  0.00,
  1000,
  '{
    "heatmaps": "limited",
    "heatmaps_per_day": 10,
    "session_replay": true,
    "frustration_detection": "basic",
    "frustration_types": 3,
    "ab_testing": false,
    "funnel_analysis": false,
    "form_analytics": false,
    "user_journeys": false,
    "cohort_analysis": false,
    "feedback_collection": false,
    "console_errors": false,
    "performance_monitoring": false,
    "network_monitoring": false,
    "revenue_tracking": false,
    "revenue_attribution": false,
    "revenue_heatmaps": false,
    "ai_insights": false,
    "api_monitoring": false,
    "live_visitor_feed": false,
    "email_reports": false,
    "api_access": false,
    "priority_support": false
  }'::jsonb
),
-- Starter Tier: Entry Point
(
  'Starter',
  29.00,
  9000.00,
  5000,
  '{
    "heatmaps": "unlimited",
    "session_replay": true,
    "frustration_detection": "full",
    "frustration_types": 6,
    "ab_testing": "basic",
    "ab_test_limit": 2,
    "visual_editor": true,
    "funnel_analysis": false,
    "form_analytics": false,
    "user_journeys": false,
    "cohort_analysis": false,
    "feedback_collection": "basic",
    "console_errors": false,
    "performance_monitoring": "basic",
    "network_monitoring": false,
    "revenue_tracking": false,
    "revenue_attribution": false,
    "revenue_heatmaps": false,
    "ai_insights": false,
    "api_monitoring": false,
    "live_visitor_feed": true,
    "email_reports": "weekly",
    "api_access": "limited",
    "priority_support": false
  }'::jsonb
),
-- Pro Tier: Revenue Attribution + AI
(
  'Pro',
  79.00,
  24000.00,
  25000,
  '{
    "heatmaps": "unlimited",
    "session_replay": true,
    "frustration_detection": "full",
    "frustration_types": 6,
    "frustration_analysis": true,
    "ab_testing": "unlimited",
    "visual_editor": true,
    "funnel_analysis": true,
    "form_analytics": true,
    "user_journeys": true,
    "cohort_analysis": true,
    "feedback_collection": "full",
    "console_errors": true,
    "js_error_tracking": true,
    "performance_monitoring": "full",
    "network_monitoring": "basic",
    "revenue_tracking": "basic",
    "revenue_attribution": true,
    "revenue_heatmaps": false,
    "cart_abandonment": true,
    "impact_quantification": true,
    "ai_insights": "weekly",
    "ai_session_summaries": 50,
    "auto_recommendations": "basic",
    "api_monitoring": false,
    "live_visitor_feed": true,
    "email_reports": "daily",
    "slack_integration": true,
    "webhook_support": true,
    "api_access": "full",
    "priority_support": true,
    "support_sla": "24h"
  }'::jsonb
),
-- Enterprise Tier: Full Suite
(
  'Enterprise',
  299.00,
  90000.00,
  NULL,
  '{
    "heatmaps": "unlimited",
    "session_replay": true,
    "frustration_detection": "full",
    "frustration_types": 6,
    "frustration_analysis": true,
    "frustration_revenue_impact": true,
    "ab_testing": "unlimited",
    "multivariate_testing": true,
    "visual_editor": true,
    "funnel_analysis": true,
    "form_analytics": true,
    "user_journeys": true,
    "cohort_analysis": true,
    "feedback_collection": "full",
    "nps_surveys": true,
    "console_errors": true,
    "js_error_tracking": true,
    "performance_monitoring": "full",
    "performance_trends": true,
    "network_monitoring": "advanced",
    "api_performance_dashboard": true,
    "revenue_tracking": "advanced",
    "revenue_attribution": "multi_touch",
    "revenue_heatmaps": true,
    "cart_abandonment": true,
    "impact_quantification": "full_dashboard",
    "ai_insights": "daily",
    "ai_session_summaries": "unlimited",
    "ai_proactive": true,
    "anomaly_detection": "realtime",
    "auto_recommendations": "advanced",
    "api_monitoring": true,
    "live_visitor_feed": true,
    "email_reports": "custom",
    "slack_integration": true,
    "webhook_support": true,
    "api_access": "full",
    "api_rate_limit": "high",
    "custom_domain": true,
    "white_label": true,
    "sso_saml": true,
    "priority_support": true,
    "support_sla": "4h",
    "dedicated_support": true,
    "account_manager": true,
    "custom_integrations": true,
    "uptime_sla": "99.9"
  }'::jsonb
);

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON TABLE subscription_plans IS 'Defines the 4 subscription tiers: Free, Starter, Pro, Enterprise';
COMMENT ON TABLE profiles IS 'Extends auth.users with custom user data and subscription link';
COMMENT ON TABLE subscriptions IS 'Tracks active and historical subscriptions per user';
COMMENT ON TABLE payment_history IS 'Records all PayHere payment transactions';
COMMENT ON TABLE usage_tracking IS 'Tracks monthly session and API usage per user/site';
