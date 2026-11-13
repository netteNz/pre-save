// claim-provider
//
//   { campaign, claim, email, consent?, source? }
//
// The fan-gate provider (Hypeddit etc.) redirects every fan to the same
// ?claim=<secret> URL, so the secret alone can't identify a fan. We check it
// against the campaign's provider_secret_hash, then require an email before
// issuing a per-fan unlock token. Rotate the secret if it leaks.
import { HttpError, email as readEmail, handle, str } from "../_shared/http.ts";
import {
  cleanSource,
  findGate,
  issueToken,
  loadCampaign,
  logEvent,
  rateLimit,
  safeEqual,
  sha256Hex,
  upsertFan,
} from "../_shared/unlock.ts";

Deno.serve(
  handle(async (req, body) => {
    const campaign = await loadCampaign(str(body, "campaign", 36));
    await rateLimit(req, "claim-provider", campaign.id);
    if (!campaign.gate_enabled) throw new HttpError(400, "Unlocking is closed for this release.");

    const gate = await findGate(campaign.id, "provider");
    const claimHash = await sha256Hex(str(body, "claim", 200));
    if (!campaign.provider_secret_hash || !safeEqual(claimHash, campaign.provider_secret_hash)) {
      throw new HttpError(403, "That unlock link isn't valid for this release.");
    }

    const fanId = await upsertFan(campaign.id, readEmail(body), body.consent === true, cleanSource(body.source));
    const token = await issueToken(campaign.id, fanId, gate.id);
    await logEvent(campaign.id, fanId, "gate_unlocked", { gate: "provider" });
    return { token };
  }),
);
