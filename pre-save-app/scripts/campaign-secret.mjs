#!/usr/bin/env node
/**
 * Generate secrets for a campaign's gates. Only the HASHES go in the database.
 *
 *   node scripts/campaign-secret.mjs provider          -> provider claim secret + SQL
 *   node scripts/campaign-secret.mjs code [uses]       -> access code + SQL (default 1 use)
 *   node scripts/campaign-secret.mjs hash <value>      -> sha256 hex of a value
 *
 * Replace <campaign-id> in the printed SQL with the campaign's uuid.
 */
import { createHash, randomBytes } from "node:crypto";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const [cmd, arg] = process.argv.slice(2);

if (cmd === "provider") {
  const secret = randomBytes(24).toString("base64url");
  console.log(`
Provider secret:  ${secret}

1. In the provider (Hypeddit etc.) set the reward / redirect URL to
     https://<your-domain>/?claim=${secret}
2. Store only the hash:
     update public.campaigns set provider_secret_hash = '${sha256(secret)}'
     where id = '<campaign-id>';

Rotating: run this again and update both. Old links stop working.
`);
} else if (cmd === "code") {
  const uses = arg ? Number(arg) : 1;
  if (!Number.isInteger(uses) || uses < 1) {
    console.error("uses must be a positive integer");
    process.exit(1);
  }
  // Codes are case-insensitive: claim-code upper-cases before hashing.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = [...randomBytes(10)].map((b) => alphabet[b % alphabet.length]).join("");
  const code = `${raw.slice(0, 5)}-${raw.slice(5)}`;
  console.log(`
Access code:  ${code}  (${uses} use${uses === 1 ? "" : "s"})

  insert into public.codes (campaign_id, code_hash, max_uses)
  values ('<campaign-id>', '${sha256(code)}', ${uses});
`);
} else if (cmd === "hash" && arg) {
  console.log(sha256(arg));
} else {
  console.error("Usage: node scripts/campaign-secret.mjs provider | code [uses] | hash <value>");
  process.exit(1);
}
