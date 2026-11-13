-- Phase 1: per-fan unlock.
--
-- Every table has row-level security on. Anonymous visitors get no table
-- access at all; they read the public campaign through get_public_campaign()
-- and everything else goes through Edge Functions using the service role.
-- Artists (phase 3) can read their own rows through the owner policies below.
--
-- Only hashes of unlock tokens, access codes, confirm tokens and provider
-- secrets are stored.

-- ------------------------------------------------------------------ tables

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_account_id text,
  created_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  format text not null default 'New single',
  tagline text not null default '',
  release_date timestamptz not null,
  artwork text not null default '',
  accent text not null default '#c6ff3d',
  platforms jsonb not null default '[]',
  presave_count integer,
  teaser_src text not null default '',
  socials jsonb not null default '[]',
  label text not null default '',
  gate_enabled boolean not null default true,
  -- sha256 hex of the secret the fan-gate provider redirects with (?claim=).
  provider_secret_hash text,
  status text not null default 'draft' check (status in ('draft', 'live', 'archived')),
  created_at timestamptz not null default now(),
  unique (artist_id, slug)
);

create table public.gates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  type text not null check (type in ('email', 'paid', 'code', 'provider')),
  -- Public settings shown on the page, e.g. {"providerName", "providerUrl"}.
  config jsonb not null default '{}',
  price_cents integer check (price_cents is null or price_cents >= 200),
  position integer not null default 0,
  enabled boolean not null default true
);
create index gates_campaign_idx on public.gates (campaign_id);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  type text not null check (type in ('listen', 'download')),
  title text not null,
  -- Object path inside the private "rewards" bucket.
  storage_path text not null,
  hide_after_release boolean not null default false,
  position integer not null default 0
);
create index rewards_campaign_idx on public.rewards (campaign_id);

create table public.fans (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  email text check (email is null or email = lower(email)),
  consent_at timestamptz,
  source jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (campaign_id, email)
);

create table public.unlocks (
  id uuid primary key default gen_random_uuid(),
  fan_id uuid references public.fans (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  gate_id uuid references public.gates (id) on delete set null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index unlocks_campaign_idx on public.unlocks (campaign_id);

create table public.codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  code_hash text not null,
  max_uses integer check (max_uses is null or max_uses > 0), -- null = unlimited
  uses integer not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, code_hash)
);

-- Pending email-gate confirmations (the link in the confirm email).
create table public.email_confirmations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  fan_id uuid not null references public.fans (id) on delete cascade,
  gate_id uuid references public.gates (id) on delete set null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.events (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  fan_id uuid references public.fans (id) on delete set null,
  name text not null,
  data jsonb not null default '{}',
  at timestamptz not null default now()
);
create index events_campaign_at_idx on public.events (campaign_id, at);

-- Fixed-window counters for the claim-* rate limits.
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- -------------------------------------------------------------------- RLS

alter table public.artists enable row level security;
alter table public.campaigns enable row level security;
alter table public.gates enable row level security;
alter table public.rewards enable row level security;
alter table public.fans enable row level security;
alter table public.unlocks enable row level security;
alter table public.codes enable row level security;
alter table public.email_confirmations enable row level security;
alter table public.events enable row level security;
alter table public.rate_limits enable row level security;

-- Owner read access for the future artist dashboard. No anon policies:
-- anonymous visitors cannot read any table directly.
create policy "artists read own" on public.artists
  for select to authenticated using (user_id = (select auth.uid()));

create policy "campaigns read own" on public.campaigns
  for select to authenticated using (
    artist_id in (select id from public.artists where user_id = (select auth.uid()))
  );

create or replace function public.owns_campaign(p_campaign uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.campaigns c
    join public.artists a on a.id = c.artist_id
    where c.id = p_campaign and a.user_id = (select auth.uid())
  );
$$;

create policy "gates read own" on public.gates
  for select to authenticated using (public.owns_campaign(campaign_id));
create policy "rewards read own" on public.rewards
  for select to authenticated using (public.owns_campaign(campaign_id));
create policy "fans read own" on public.fans
  for select to authenticated using (public.owns_campaign(campaign_id));
create policy "unlocks read own" on public.unlocks
  for select to authenticated using (public.owns_campaign(campaign_id));
create policy "codes read own" on public.codes
  for select to authenticated using (public.owns_campaign(campaign_id));
create policy "events read own" on public.events
  for select to authenticated using (public.owns_campaign(campaign_id));

-- -------------------------------------------------------------- functions

-- Public campaign payload, in the same shape as src/campaign.js plus ids.
-- Never returns secrets, hashes or storage paths.
create or replace function public.get_public_campaign(p_artist text, p_campaign text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'artistSlug', a.slug,
    'slug', c.slug,
    'artist', a.name,
    'title', c.title,
    'format', c.format,
    'tagline', c.tagline,
    'releaseDate', c.release_date,
    'artwork', c.artwork,
    'accent', c.accent,
    'platforms', c.platforms,
    'presaveCount', c.presave_count,
    'teaserSrc', c.teaser_src,
    'socials', c.socials,
    'label', c.label,
    'gate', jsonb_build_object(
      'enabled', c.gate_enabled,
      'gates', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', g.id, 'type', g.type, 'config', g.config, 'priceCents', g.price_cents)
                 order by g.position)
        from public.gates g where g.campaign_id = c.id and g.enabled
      ), '[]'::jsonb),
      'rewards', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id, 'type', r.type, 'title', r.title,
                 'hideAfterRelease', r.hide_after_release)
                 order by r.position)
        from public.rewards r where r.campaign_id = c.id
      ), '[]'::jsonb)
    )
  )
  from public.campaigns c
  join public.artists a on a.id = c.artist_id
  where a.slug = p_artist and c.slug = p_campaign and c.status = 'live';
$$;

-- Funnel events from the public page. Name and payload size are bounded so
-- the endpoint can't be used as free storage.
create or replace function public.log_event(p_campaign uuid, p_name text, p_data jsonb default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_name !~ '^[a-z][a-z0-9_]{0,39}$' then
    raise exception 'invalid event name';
  end if;
  if pg_column_size(coalesce(p_data, '{}'::jsonb)) > 2048 then
    raise exception 'event data too large';
  end if;
  insert into public.events (campaign_id, name, data)
  select c.id, p_name, coalesce(p_data, '{}'::jsonb)
  from public.campaigns c where c.id = p_campaign and c.status = 'live';
end;
$$;

-- Returns true when the call is allowed (and counts it), false when the
-- limit for the current window is used up. Service role only.
create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = rl.count + 1
  returning count into v_count;

  -- Opportunistic cleanup of old windows.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_max;
end;
$$;

-- Atomically consume one use of an access code. Returns the code id, or
-- null when the code is unknown or used up. Service role only.
create or replace function public.redeem_code(p_campaign uuid, p_code_hash text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  update public.codes
     set uses = uses + 1
   where campaign_id = p_campaign
     and code_hash = p_code_hash
     and (max_uses is null or uses < max_uses)
  returning id;
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.redeem_code(uuid, text) from public, anon, authenticated;
revoke execute on function public.owns_campaign(uuid) from public, anon;
grant execute on function public.get_public_campaign(text, text) to anon, authenticated;
grant execute on function public.log_event(uuid, text, jsonb) to anon, authenticated;
