// reward-url
//
//   { campaign, token }            -> { valid: true } if the unlock token is live
//   { campaign, token, reward }    -> { url, expiresIn } short-lived signed URL
//
// Rewards marked hide_after_release are refused once the release date has
// passed (the file stops being reachable, not just hidden in the UI).
import { HttpError, handle, optStr, str } from "../_shared/http.ts";
import { db, loadCampaign, logEvent, sha256Hex } from "../_shared/unlock.ts";

const LISTEN_TTL = Number(Deno.env.get("REWARD_LISTEN_TTL") ?? 900); // seconds
const DOWNLOAD_TTL = Number(Deno.env.get("REWARD_DOWNLOAD_TTL") ?? 60);

// Inside the local Docker network SUPABASE_URL is http://kong:8000, which the
// browser can't reach. Rewrite signed URLs onto the public API origin.
function publicUrl(signed: string): string {
  const pub = Deno.env.get("PUBLIC_SUPABASE_URL");
  if (!pub) return signed;
  const u = new URL(signed);
  const p = new URL(pub);
  u.protocol = p.protocol;
  u.host = p.host;
  return u.toString();
}

Deno.serve(
  handle(async (_req, body) => {
    const campaign = await loadCampaign(str(body, "campaign", 36));
    const tokenHash = await sha256Hex(str(body, "token", 100));

    const { data: unlock, error } = await db()
      .from("unlocks")
      .select("id, fan_id, revoked_at")
      .eq("token_hash", tokenHash)
      .eq("campaign_id", campaign.id)
      .maybeSingle();
    if (error) throw error;
    if (!unlock || unlock.revoked_at) throw new HttpError(401, "This unlock is no longer valid.");

    const rewardId = optStr(body, "reward", 36);
    if (!rewardId) return { valid: true };

    const { data: reward, error: rErr } = await db()
      .from("rewards")
      .select("id, type, storage_path, hide_after_release")
      .eq("id", rewardId)
      .eq("campaign_id", campaign.id)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!reward) throw new HttpError(404, "Unknown reward");
    if (reward.hide_after_release && new Date(campaign.release_date).getTime() <= Date.now()) {
      throw new HttpError(410, "This early listen ended at release. It's out everywhere now.");
    }

    const ttl = reward.type === "listen" ? LISTEN_TTL : DOWNLOAD_TTL;
    const filename = reward.storage_path.split("/").pop()!;
    const { data: signed, error: sErr } = await db()
      .storage.from("rewards")
      .createSignedUrl(reward.storage_path, ttl, reward.type === "download" ? { download: filename } : undefined);
    if (sErr || !signed) throw sErr ?? new Error("signing failed");

    await logEvent(campaign.id, unlock.fan_id, reward.type === "listen" ? "reward_stream" : "reward_download", {
      reward: reward.id,
    });
    return { url: publicUrl(signed.signedUrl), expiresIn: ttl };
  }),
);
