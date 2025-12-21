-- Create Audit Logs table for Admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_resource TEXT NOT NULL, -- The ID of the thing being changed (user_id, site_id, etc.)
    details JSONB DEFAULT '{}'::jsonb, -- Store diffs or parameters here
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Read-only for admins, Write only via service role/admin functions)
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for reading (if we had authenticated admin users in Supabase Auth, but we use custom cookie auth)
-- For now, we'll access this table using the Service Role key in the Admin API, so RLS policies are bypassed by the server.
-- However, to be safe, we can default deny public access.
CREATE POLICY "Deny public access" ON admin_audit_logs
    FOR ALL
    TO public
    USING (false);
