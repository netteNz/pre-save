#!/usr/bin/env node
/**
 * Generate (or hash) the secret unlock key for a fan-gate campaign.
 *
 *   node scripts/unlock-key.mjs                 -> new key + hash + setup steps
 *   node scripts/unlock-key.mjs --key <key>     -> hash of an existing key
 *
 * Only the HASH goes in src/campaign.js. The key itself lives in your
 * provider's reward URL and in the public/rewards/<key>/ folder name.
 */
import { createHash, randomBytes } from "node:crypto";

const i = process.argv.indexOf("--key");
const key = i > -1 ? process.argv[i + 1] : randomBytes(24).toString("base64url");
if (!key) {
  console.error("Usage: node scripts/unlock-key.mjs [--key <key>]");
  process.exit(1);
}
const hash = createHash("sha256").update(key).digest("hex");

if (i > -1) {
  console.log(hash);
} else {
  console.log(`
Unlock key:   ${key}
keyHash:      ${hash}

1. Put reward files in:   public/rewards/${key}/
2. Provider reward URL:   https://<your-domain>/?unlock=${key}
3. In src/campaign.js set gate.keyHash to the hash above.

Keep the key out of git and out of campaign.js.
`);
}
