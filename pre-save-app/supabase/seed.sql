-- Local development seed: the "Low Tide" campaign as the only campaign.
--
-- The provider secret and access code below are DEV-ONLY values so the gates
-- can be tested locally:
--   provider claim link:  http://localhost:5173/?claim=dev-claim-low-tide
--   access code:          LOWTIDE-EARLY  (10 uses)
-- For a real deployment generate new ones with `node scripts/campaign-secret.mjs`
-- and store only the hashes.
--
-- Reward files are uploaded to the private "rewards" bucket from
-- supabase/seed-files/rewards/ (gitignored) by `supabase start` / `db reset`.

insert into public.artists (id, name, slug)
values ('00000000-0000-4000-8000-000000000001', 'Chris.Wave', 'chris-wave');

insert into public.campaigns (
  id, artist_id, slug, title, format, tagline, release_date, accent,
  platforms, socials, label, gate_enabled, provider_secret_hash, status
) values (
  '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-000000000001',
  'low-tide',
  'Low Tide',
  'New single',
  'A slow-burning love letter to the hour after midnight.',
  '2026-12-05T00:00:00-05:00',
  '#c6ff3d',
  '[
    {"name": "Spotify", "action": "Pre-save", "href": "https://open.spotify.com", "primary": true},
    {"name": "Apple Music", "action": "Pre-add", "href": "https://music.apple.com"},
    {"name": "YouTube Music", "action": "Notify me", "href": "https://music.youtube.com"},
    {"name": "Amazon Music", "action": "Pre-save", "href": "https://music.amazon.com"},
    {"name": "Deezer", "action": "Pre-save", "href": "https://www.deezer.com"},
    {"name": "Bandcamp", "action": "Pre-order", "href": "https://bandcamp.com"}
  ]',
  '[
    {"name": "Instagram", "href": "https://instagram.com"},
    {"name": "TikTok", "href": "https://tiktok.com"},
    {"name": "YouTube", "href": "https://youtube.com"}
  ]',
  'Independent release',
  true,
  encode(sha256(convert_to('dev-claim-low-tide', 'UTF8')), 'hex'),
  'live'
);

insert into public.gates (campaign_id, type, config, position) values
  ('00000000-0000-4000-8000-0000000000a1', 'provider',
   '{"providerName": "Hypeddit", "providerUrl": "https://hypeddit.com"}', 0),
  ('00000000-0000-4000-8000-0000000000a1', 'email', '{}', 1),
  ('00000000-0000-4000-8000-0000000000a1', 'code', '{}', 2);

insert into public.rewards (campaign_id, type, title, storage_path, hide_after_release, position) values
  ('00000000-0000-4000-8000-0000000000a1', 'listen', 'Full track, 3 weeks early',
   'low-tide/early-listen.mp3', true, 0),
  ('00000000-0000-4000-8000-0000000000a1', 'download', 'Demo + stems (.zip)',
   'low-tide/low-tide-extras.zip', false, 1);

insert into public.codes (campaign_id, code_hash, max_uses) values
  ('00000000-0000-4000-8000-0000000000a1',
   encode(sha256(convert_to('LOWTIDE-EARLY', 'UTF8')), 'hex'), 10);
