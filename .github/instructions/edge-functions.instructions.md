---
applyTo: "pre-save-app/supabase/functions/**"
---

# Edge Function review

- Every public function must be wrapped in `handle()` from `_shared/http.ts`. Read string fields only through `str`, `optStr` and `email`, with an explicit max length. Check other types directly: booleans with `=== true`, objects through an allowlist sanitizer like `cleanSource()`.
- Every `claim-*` function must call `rateLimit()` immediately after `loadCampaign()` (it needs the campaign id), before any other lookup or write.
- `clientIp()` trusts spoofable headers (`cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`). Flag any new use of these headers for auth, allowlisting or anything beyond rate-limit keys.
- `db()` is the service-role client. It must stay server-side; never return its key, raw rows with hashes, or storage paths to the caller.
- Compare secret hashes with `safeEqual()`, never `===`. Store and look up only `sha256Hex()` values.
- Escape any fan or campaign text placed in email HTML with `escapeHtml()`, including URLs in `href`.
- `DEV_EXPOSE_CONFIRM_LINK` must default off: enabled only by an explicit `"true"`. Flag any change that inverts this or exposes the link when mail is configured.
- Errors: throw `HttpError` with a user-safe message. Unexpected errors must fall through to the generic 500; never put DB errors, stack traces or env values in a response.
- CORS: `ALLOWED_ORIGINS` falls back to `*`. Flag any change that widens it further or adds credentialed CORS with a wildcard.
- Flag logs that print tokens, confirm links, codes or raw emails.
