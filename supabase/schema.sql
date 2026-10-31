-- Outlier Agent: Supabase schema
-- Run this once in the Supabase dashboard -> SQL Editor -> New query -> Run.
-- All access from the app goes through the service_role key (server-side only), which
-- bypasses Row Level Security by design, so RLS is left at its default (enabled, no policies).

-- 1. Kanban board / saved outliers pipeline
create table if not exists board_items (
  id text primary key,
  candidate_id text not null,
  candidate_url text,
  candidate jsonb not null,
  breakdown jsonb,
  status text not null default 'saved',
  assigned_to text,
  notes text,
  tags jsonb,
  scheduled_shoot_date text,
  posted_url text,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists board_items_candidate_url_idx on board_items (candidate_url);
create index if not exists board_items_candidate_id_idx on board_items (candidate_id);

-- 2. Latest ranked radar scan results (replaced wholesale on each scan)
create table if not exists radar_cache (
  id text primary key,
  candidate jsonb not null,
  outlier_score numeric,
  platform text,
  matched_keyword text,
  updated_at timestamptz not null default now()
);
create index if not exists radar_cache_score_idx on radar_cache (outlier_score desc);

-- 3. Master video registry - dedup cache so a video is never re-scraped/re-analyzed (72h TTL enforced in app)
create table if not exists video_registry (
  id text primary key,
  candidate jsonb not null,
  breakdown jsonb,
  cached_at timestamptz not null default now()
);

-- 4. Per-keyword search result cache, avoids repeat Apify/YouTube spend (24h TTL enforced in app)
create table if not exists search_cache (
  id text primary key, -- `${keyword}_${platform}`
  keyword text not null,
  platform text not null,
  candidates jsonb not null,
  searched_at timestamptz not null default now()
);

-- 5. Active brand + keyword lists (single row)
create table if not exists brand_config (
  id text primary key default 'singleton',
  active_brand text not null default 'AHL',
  ahl_keywords jsonb not null default '[]'::jsonb,
  alchemane_keywords jsonb not null default '[]'::jsonb
);

-- 6. Team members / daily targets
create table if not exists team_members (
  id text primary key,
  name text not null,
  role text,
  daily_target integer default 10,
  phone text,
  notes text
);

-- 7. Shareable "Send to Sir" visual review links (swipeable 6-reasons card view)
create table if not exists review_links (
  id text primary key, -- short random token, used in the public /review/<id> URL
  candidate jsonb not null,
  six_reasons jsonb not null,
  video_url text not null,
  video_title text,
  status text not null default 'pending', -- pending | approved | disapproved
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- 8. Format Map tags: one Format x Editing Style per video (keyed like video_registry: lower-cased URL).
-- Separate from the candidate jsonb because radar scans rewrite cached candidates wholesale.
create table if not exists format_labels (
  id text primary key,
  format text not null,
  editing_style text not null,
  source text not null, -- video | frames | thumbnail
  tagged_at timestamptz not null default now()
);
