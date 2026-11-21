---
applyTo: "pre-save-app/supabase/migrations/**"
---

# Migration review

- Never edit a migration already merged to `main`. Changes go in a new timestamped migration.
- Every new table must `enable row level security` in the same migration.
- No policies for `anon` on any table. Anonymous clients reach data only through `security definer` RPCs.
- Every `security definer` function must `set search_path = ''` and fully qualify every object (`public.table`, `extensions.fn`).
- Every new function needs explicit `grant`/`revoke execute`. Service-role-only functions must be revoked from `public, anon, authenticated`.
- Public RPCs (granted to `anon`) must never return hashes, secrets, emails, provider config secrets or storage paths. Check every field added to `get_public_campaign`.
- Bound every anon-reachable input: validate names with a regex, cap payload size (as `log_event` does), and filter to `status = 'live'` campaigns.
- Hash columns hold SHA-256 hex only. Flag columns that would store raw tokens, codes or confirm links.
- Flag destructive changes (drop, type narrowing, `not null` without default) that lack a data migration step.
