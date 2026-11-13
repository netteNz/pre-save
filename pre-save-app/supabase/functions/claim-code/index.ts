// claim-code
//
//   { campaign, code, email?, consent?, source? }
//
// Validates an artist-issued access code, consumes one use atomically and
// issues a per-fan unlock token. Email is optional for this gate.
import { HttpError, email as readEmail, handle, str } from "../_shared/http.ts";
import {
  cleanSource,
  db,
  findGate,
  issueToken,
  loadCampaign,
  logEvent,
  rateLimit,
  sha256Hex,
  upsertFan,
} from "../_shared/unlock.ts";

Deno.serve(
  handle(async (req, body) => {
    const campaign = await loadCampaign(str(body, "campaign", 36));
    await rateLimit(req, "claim-code", campaign.id);
    if (!campaign.gate_enabled) throw new HttpError(400, "Unlocking is closed for this release.");

    const gate = await findGate(campaign.id, "code");
    // Codes are case-insensitive and stored upper-cased before hashing.
    const code = str(body, "code", 100).toUpperCase();
    const email = body.email ? readEmail(body) : null;

    const { data: codeId, error } = await db().rpc("redeem_code", {
      p_campaign: campaign.id,
      p_code_hash: await sha256Hex(code),
    });
    if (error) throw error;
    if (!codeId) throw new HttpError(403, "That code isn't valid or has been used up.");

    const fanId = await upsertFan(campaign.id, email, Boolean(email) && body.consent === true, cleanSource(body.source));
    const token = await issueToken(campaign.id, fanId, gate.id);
    await logEvent(campaign.id, fanId, "gate_unlocked", { gate: "code" });
    return { token };
  }),
);
