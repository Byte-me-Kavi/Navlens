ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

UPDATE subscription_plans 
SET status = 'inactive' 
WHERE name = 'Enterprise';
