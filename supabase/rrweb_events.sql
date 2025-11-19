-- Create rrweb_events table for storing mouse movements, scroll events, etc.
CREATE TABLE IF NOT EXISTS rrweb_events (
    id SERIAL PRIMARY KEY,
    site_id TEXT NOT NULL,
    page_path TEXT NOT NULL,
    session_id TEXT NOT NULL,
    user_id UUID NOT NULL, -- Site owner's user ID
    visitor_id TEXT, -- Visitor's anonymous ID
    events JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Additional user details for session replay
    ip_address TEXT,
    country TEXT,
    user_agent TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    language TEXT,
    timezone TEXT,
    referrer TEXT,
    viewport_width INTEGER,
    viewport_height INTEGER,
    device_pixel_ratio NUMERIC(5,2),
    platform TEXT,
    cookie_enabled BOOLEAN,
    online BOOLEAN,
    device_type TEXT,
    load_time NUMERIC(10,2),
    dom_ready_time NUMERIC(10,2)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rrweb_events_site_id ON rrweb_events (site_id);
CREATE INDEX IF NOT EXISTS idx_rrweb_events_session_id ON rrweb_events (session_id);
CREATE INDEX IF NOT EXISTS idx_rrweb_events_timestamp ON rrweb_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_rrweb_events_page_path ON rrweb_events (page_path);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE rrweb_events ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to insert their own events
CREATE POLICY "Users can insert rrweb events" ON rrweb_events
    FOR INSERT WITH CHECK (true); -- Allow inserts for now, you can restrict this later

-- Policy to allow users to read their own events
CREATE POLICY "Users can read rrweb events" ON rrweb_events
    FOR SELECT USING (user_id = auth.uid()); -- Only allow reading events for the authenticated user's sites