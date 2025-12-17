-- Create editor_tokens table for one-time use editor URLs
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.editor_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token VARCHAR(48) NOT NULL UNIQUE,
    experiment_id UUID NOT NULL,
    variant_id VARCHAR(64) NOT NULL,
    user_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign keys
    CONSTRAINT fk_experiment FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_editor_tokens_token ON public.editor_tokens(token);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_editor_tokens_expires_at ON public.editor_tokens(expires_at);

-- RLS policies (optional but recommended)
ALTER TABLE public.editor_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage all tokens" ON public.editor_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Optional: Auto-cleanup function for expired tokens (run periodically)
-- DELETE FROM public.editor_tokens WHERE expires_at < NOW() - INTERVAL '1 day';
