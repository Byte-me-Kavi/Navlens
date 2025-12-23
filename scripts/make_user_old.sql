-- Run this in your Supabase Dashboard SQL Editor
-- Link: https://supabase.com/dashboard/project/_/sql/new

UPDATE auth.users
SET created_at = NOW() - INTERVAL '31 days'
WHERE email = 'kaveeshatrishan3176@gmail.com';

-- Verify the change
SELECT email, created_at FROM auth.users WHERE email = 'kaveeshatrishan3176@gmail.com';
