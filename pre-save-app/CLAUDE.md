# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A pre-save landing page with a per-fan reward vault. Fans unlock rewards (early listen, downloads) through a gate: fan-gate provider redirect (Hypeddit etc.), email confirm, or access code. Each fan gets their own token; reward files are served from a private bucket through short-lived signed URLs. Paid unlocks (Stripe), a self-serve artist dashboard with a router, and a Pro plan are later phases. The product/business plan lives outside the repo; the parent `../README.md` holds the current layout, unlock flows and the phase 1 pending checklist. Keep that README in sync when the flow changes.

The git root is the parent folder (`D:\code\web-development\pre-save`), not `pre-save-app/`. All code, including the backend, lives inside `pre-save-app/`.

## Commands

Run from `pre-save-app/`:

```sh
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # production build to dist/
npm run lint       # ESLint (flat config, eslint.config.js)
npm run preview    # serve dist/
node scripts/campaign-secret.mjs provider|code [uses]|hash <value>   # gate secrets; prints only hashes + SQL
```

There is no test suite. Verification is `npm run lint` and `npm run build`, plus the manual end-to-end checks listed in `../README.md`.

## Backend status: scaffolded, not wired

The Supabase backend (`supabase/`) is written as code but has never run against a live or local Supabase. Do not start Docker, run `supabase start`, or install the Supabase CLI or other global tools unless asked. Write the code and leave TODOs for steps that need a running service; the user wires services separately.

`public/rewards/<key>/` still holds the real reward files, and `npm run build` copies them into `dist/`. **Do not deploy any build** and do not delete `public/rewards/` or `dist/` until the files are confirmed in the private `rewards` bucket (seeded from the gitignored `supabase/seed-files/rewards/`).

## Architecture

**Frontend** (Vite + React 19 + Tailwind 4 + anime.js, plain JS/JSX):

- `src/App.jsx` fetches one campaign chosen by `VITE_ARTIST_SLUG` / `VITE_CAMPAIGN_SLUG` (no router until phase 3). If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing, it falls back to the demo campaign in `src/campaign.js` with the gate off.
- `src/campaign.js` is both the demo data and the shape reference for what `get_public_campaign` returns. Change both together.
- `src/lib/api.js` is a plain-`fetch` client (no Supabase SDK in the frontend): RPCs at `/rest/v1/rpc/*` and Edge Functions at `/functions/v1/*`. Only the public anon key belongs in the browser.
- `src/components/landing/useUnlock.js` owns the unlock state machine. On load it reads `?confirm=`, `?token=`, `?claim=` (and legacy `?unlock=`, treated as a claim), strips them from the address bar, and stores the token in localStorage under `presave-unlock:<campaignId>`. A pending provider claim waits in sessionStorage until the fan gives an email. Requests are deduplicated per token so React StrictMode's double effect can't spend a single-use confirm link twice. It returns `{ unlocked, fresh, error, ... }`; `fresh` drives the reveal animation in `UnlockGate.jsx`.
- `UnlockGate.jsx` renders the gates and the anime.js reveal; rewards are fetched on demand via `reward-url`.
- The **campaign id** (never the title) is the identifier for storage keys, waveform seeds (`seedFrom`), the `.ics` UID and API calls.
- `utils.js` `track()` pushes to `window.dataLayer` and also posts to the `log_event` RPC once `setTrackCampaign(id)` has been called.

**Backend** (`supabase/`):

- `migrations/` holds the schema with RLS on every table: artists, campaigns, gates, rewards, fans, unlocks, codes, email_confirmations, events, rate_limits. Anonymous clients get no table access. The only public entry points are the `security definer` RPCs `get_public_campaign` (returns no secrets) and `log_event`. `hit_rate_limit` and `redeem_code` are revoked from anon/authenticated and called only by Edge Functions with the service role.
- Only SHA-256 hashes of tokens, codes, confirm links and provider secrets are stored.
- `functions/` contains the Deno Edge Functions `claim-email` (modes `notify`, `gate`, `confirm`), `claim-provider`, `claim-code` and `reward-url`. Shared code is in `_shared/`: `http.ts` (CORS, `HttpError`, client IP), `unlock.ts` (service-role client, hashing, token issue/verify, rate limiting) and `mail.ts` (Resend placeholder; logs the link when no provider is configured).
- `seed.sql` seeds "Low Tide" as the only campaign with dev values: claim `dev-claim-low-tide`, code `LOWTIDE-EARLY`.
- Env: frontend values go in `.env.local` (see `.env.example`); function secrets go in `supabase/functions/.env` (see `supabase/functions/.env.example`). Service-role, email and Stripe keys never go in `VITE_*` vars.
