create table public.rrweb_events (
  id serial not null,
  site_id text not null,
  page_path text not null,
  session_id text not null,
  user_id uuid null default '00000000-0000-0000-0000-000000000000'::uuid,
  visitor_id text null,
  events jsonb not null,
  timestamp timestamp with time zone not null,
  created_at timestamp with time zone null default now(),
  ip_address text null,
  country text null,
  user_agent text null,
  screen_width integer null,
  screen_height integer null,
  language text null,
  timezone text null,
  referrer text null,
  viewport_width integer null,
  viewport_height integer null,
  device_pixel_ratio numeric(5, 2) null,
  platform text null,
  cookie_enabled boolean null,
  online boolean null,
  device_type text null,
  load_time numeric(10, 2) null,
  dom_ready_time numeric(10, 2) null,
  constraint rrweb_events_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_rrweb_events_site_id on public.rrweb_events using btree (site_id) TABLESPACE pg_default;

create index IF not exists idx_rrweb_events_session_id on public.rrweb_events using btree (session_id) TABLESPACE pg_default;

create index IF not exists idx_rrweb_events_timestamp on public.rrweb_events using btree ("timestamp") TABLESPACE pg_default;

create index IF not exists idx_rrweb_events_page_path on public.rrweb_events using btree (page_path) TABLESPACE pg_default;