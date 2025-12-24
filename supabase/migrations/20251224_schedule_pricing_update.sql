-- Enable the pg_cron extension if not already enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the update-exchange-rates function to run daily at midnight
-- NOTE: You MUST replace <project-ref> and <anon-key> with your actual project values.
select
  cron.schedule(
    'update-exchange-rates-daily',
    '0 0 * * *', -- Every day at midnight
    $$
    select
      net.http_post(
        url:='https://vvetjjmfupqapsafscst.supabase.co/functions/v1/update-exchange-rates',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2ZXRqam1mdXBxYXBzYWZzY3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjA5NjQsImV4cCI6MjA3ODY5Njk2NH0.RUCanmoSxmlZ9WVJ6CgqibtHb_RsMI1gXD4B_jJvuUo"}'::jsonb
      ) as request_id;
    $$
  );
