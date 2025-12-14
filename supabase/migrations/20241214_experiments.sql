-- Experiments Configuration Table
-- Stores A/B test experiment definitions

CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  variants JSONB NOT NULL DEFAULT '[]', -- Array of {id, name, weight, description}
  modifications JSONB NOT NULL DEFAULT '[]', -- Array of {id, variant_id, selector, type, changes}
  traffic_percentage INTEGER NOT NULL DEFAULT 100 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  goal_event VARCHAR(100),
  target_urls TEXT[], -- Array of URL patterns where experiment is active
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_experiments_site_id ON experiments(site_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_site_status ON experiments(site_id, status);

-- Row Level Security
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access experiments for their own sites
CREATE POLICY "Users can view their own experiments"
  ON experiments FOR SELECT
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can create experiments for their own sites"
  ON experiments FOR INSERT
  WITH CHECK (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own experiments"
  ON experiments FOR UPDATE
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own experiments"
  ON experiments FOR DELETE
  USING (site_id IN (SELECT id FROM sites WHERE user_id = auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_experiments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER experiments_updated_at
  BEFORE UPDATE ON experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_experiments_updated_at();

-- Comment for documentation
COMMENT ON TABLE experiments IS 'A/B test experiment configurations for Navlens';
COMMENT ON COLUMN experiments.variants IS 'JSON array of variant objects: [{id, name, weight, description}]';
COMMENT ON COLUMN experiments.traffic_percentage IS 'Percentage of total site traffic included in experiment (0-100)';
COMMENT ON COLUMN experiments.goal_event IS 'Event name to track as conversion goal';
