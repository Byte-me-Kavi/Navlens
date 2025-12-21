-- Add status column to sites table with default 'active'
ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'banned', 'archived'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
