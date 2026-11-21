# Code review instructions

Context: read `pre-save-app/CLAUDE.md` for architecture and commands. Do not restate it in comments.

## Focus

- Prioritize correctness and security bugs. Comment only when the issue is concrete and actionable.
- Skip style and formatting nits, naming bikeshedding, and comment or doc wording.
- Skip lockfile-only diffs. Comment on `package-lock.json` only when a direct dependency is added or removed, or a known-vulnerable version is introduced.

## Secrets and data (highest priority)

- Only the public anon key may reach the browser. Flag any service-role, email (Resend), Stripe or other secret in a `VITE_*` var, in `src/`, or in any frontend code path.
- Flag committed `.env` files (only `.env.example` files are allowed) and committed reward media under `public/rewards/` or `supabase/seed-files/`.
- Server-side, only SHA-256 hashes of fan tokens, access codes, confirm links and provider secrets are stored. Flag code that persists a raw value in the database or writes one to logs or `events` (including `console.log` of links or tokens). Returning the raw token to the fan who claimed it, and storing it in that fan's localStorage, is intended.
- Flag raw client IPs or emails written to logs or `events`.

## Correctness

- The first lookup (`get_public_campaign`) uses artist and campaign slugs. After that, the returned campaign id, never the title or slug, keys localStorage, waveform seeds, the `.ics` UID and every later API call.
- `src/campaign.js` and the `get_public_campaign` RPC define the same shape. Flag a change to one without the matching change to the other.
- Unlock state in `useUnlock.js` must stay idempotent per token: single-use confirm links must not be spent twice (React StrictMode runs effects twice).
- Flag frontend calls that bypass `src/lib/api.js` or add the Supabase SDK to the frontend.

## Dependencies

- Flag any new dependency (frontend or Edge Function `npm:` import) whose need is not explained in the PR. Prefer the platform or existing code.

## Process

- Flag changes that alter the unlock flow without updating `README.md`.
- Flag anything that would deploy a build while reward files still sit in `public/rewards/`.
