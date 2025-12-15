-- Add goals column to experiments table
-- Migration: Enterprise Goal Tracking

-- Add goals JSONB column
ALTER TABLE experiments 
ADD COLUMN IF NOT EXISTS goals JSONB NOT NULL DEFAULT '[]';

-- Migrate existing goal_event to goals array (backward compatibility)
UPDATE experiments 
SET goals = jsonb_build_array(
  jsonb_build_object(
    'id', 'goal_' || substring(md5(random()::text) from 1 for 8),
    'name', COALESCE(goal_event, 'Conversion'),
    'type', 'custom_event',
    'is_primary', true,
    'event_name', COALESCE(goal_event, 'conversion')
  )
)
WHERE goal_event IS NOT NULL 
  AND (goals IS NULL OR goals = '[]'::jsonb);

-- Create index for goal queries
CREATE INDEX IF NOT EXISTS idx_experiments_goals ON experiments USING GIN (goals);

-- Add comment for documentation
COMMENT ON COLUMN experiments.goals IS 'Array of goal definitions with type-specific config (click, pageview, custom_event, revenue)';
