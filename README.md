# Pre-Save

A pre-save landing page with a per-fan reward vault: fans pre-save through a
fan-gate provider (Hypeddit etc.), enter an email, or use an access code, and
each fan gets their own unlock token. Reward files sit in a private bucket and
are served through short-lived signed URLs, so a leaked link stops working.

## Layout

```
pre-save-app/                  Vite + React 19 + Tailwind 4 + anime.js
  src/campaign.js              demo campaign and shape reference
  src/lib/api.js               fetch client for Supabase (RPC + Edge Functions)
  src/components/landing/      landing page, useUnlock, UnlockGate (gates UI)
  scripts/campaign-secret.mjs  generates provider secrets / access codes (prints hashes + SQL)
  supabase/
    migrations/                schema + row-level security
    seed.sql                   "Low Tide" as the only campaign (dev secrets)
    functions/                 claim-email, claim-provider, claim-code, reward-url
    seed-files/rewards/        real reward files for the local bucket (gitignored)
```

## How unlocking works

| Gate | Flow |
|---|---|
| Provider | Provider redirects to `/?claim=<secret>` (old `/?unlock=<key>` links are accepted as a claim). The page asks for an email, then `claim-provider` checks the secret hash and issues a token. |
| Email | `claim-email` (mode `gate`) records the fan and emails a confirm link `/?confirm=<t>`; the page exchanges it for a token. |
| Code | `claim-code` consumes one use of an access code and issues a token. |
| Paid | Phase 2 (Stripe Checkout + webhook). |

The token is stored in `localStorage` under the campaign id. `reward-url`
checks it and returns a signed URL (15 min for listens, 60 s for downloads).
Rewards marked `hide_after_release` are refused server-side after the release
date. The release-day email form also goes through `claim-email` (mode
`notify`) and only shows success when the server saved the signup.

Only hashes of tokens, codes, confirm links and provider secrets are stored.
The `claim-*` functions are rate-limited per IP and per campaign.

## Local development

Requires Docker and the Supabase CLI (not installed by this repo).

```sh
cd pre-save-app
npm install
cp .env.example .env.local                         # fill VITE_SUPABASE_ANON_KEY after `supabase start`
cp supabase/functions/.env.example supabase/functions/.env
supabase start                                     # applies migrations + seed, creates the rewards bucket
supabase functions serve --env-file supabase/functions/.env
npm run dev
```

Dev values from `supabase/seed.sql`:

- Provider claim: `http://localhost:5173/?claim=dev-claim-low-tide`
- Access code: `LOWTIDE-EARLY` (10 uses)
- Email gate: with no email provider configured and `DEV_EXPOSE_CONFIRM_LINK=true`,
  the confirm link is shown on the page and logged by the function.

## Status: phase 1 (per-fan unlock)

Done as code, not yet run against a live Supabase:

- [x] Schema, RLS, seed, Edge Functions, `.env.example` files
- [x] New `useUnlock`, gates UI, campaign id instead of title as identifier
- [x] Notify form wired to `claim-email` with a real error state

Pending (needs a running Supabase or a decision):

- [ ] Apply migrations and seed (`supabase start` or `supabase db reset`)
- [ ] Reward files are copied to `supabase/seed-files/rewards/low-tide/`
      (gitignored); confirm they land in the private `rewards` bucket
- [ ] Delete `pre-save-app/public/rewards/` and `pre-save-app/dist/` after the
      bucket upload is confirmed. **Until then `npm run build` still copies the
      reward files into `dist/`: do not deploy a build.**
- [ ] Run the phase 1 verification: each gate end to end, signed URL expiry
      (403 after expiry), no-token profile cannot reach rewards, rate limit,
      `fans` / `unlocks` rows match
- [ ] Choose an email provider (code has a Resend placeholder in
      `supabase/functions/_shared/mail.ts`) and set `SITE_URL`, `MAIL_FROM`
- [ ] Production secrets: run `node scripts/campaign-secret.mjs provider` (or
      reuse the current Hypeddit key hash as `provider_secret_hash` so existing
      `?unlock=` links keep working), and set the provider redirect to `?claim=`
- [ ] Choose a host, only once `public/rewards/` is gone

Later phases: paid unlock (Stripe), self-serve dashboard and router, Pro plan.

## License

MIT

## Author

Built by netteNz — https://github.com/netteNz
