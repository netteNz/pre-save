// claim-email
//
//   { mode: "notify",  campaign, email, consent, source? }
//       Release-day signup (no unlock). Records the fan.
//   { mode: "gate",    campaign, email, consent?, source? }
//       Email gate: records the fan and emails a confirm link (?confirm=...).
//   { mode: "confirm", campaign, token }
//       Confirm link clicked: issues the per-fan unlock token.
import { HttpError, email as readEmail, handle, str } from "../_shared/http.ts";
import {
  cleanSource,
  db,
  findGate,
  issueToken,
  loadCampaign,
  logEvent,
  randomToken,
  rateLimit,
  sha256Hex,
  upsertFan,
} from "../_shared/unlock.ts";
import { escapeHtml, sendMail } from "../_shared/mail.ts";

const CONFIRM_TTL_HOURS = 24;

Deno.serve(
  handle(async (req, body) => {
    const mode = str(body, "mode", 10);
    const campaign = await loadCampaign(str(body, "campaign", 36));
    await rateLimit(req, "claim-email", campaign.id);

    if (mode === "notify") {
      if (body.consent !== true) throw new HttpError(400, "Please tick the consent box.");
      const fanId = await upsertFan(campaign.id, readEmail(body), true, cleanSource(body.source));
      await logEvent(campaign.id, fanId, "notify_signup");
      return { ok: true };
    }

    if (mode === "gate") {
      if (!campaign.gate_enabled) throw new HttpError(400, "Unlocking is closed for this release.");
      const gate = await findGate(campaign.id, "email");
      const to = readEmail(body);
      const fanId = await upsertFan(campaign.id, to, body.consent === true, cleanSource(body.source));

      const token = randomToken();
      const { error } = await db().from("email_confirmations").insert({
        campaign_id: campaign.id,
        fan_id: fanId,
        gate_id: gate.id,
        token_hash: await sha256Hex(token),
        expires_at: new Date(Date.now() + CONFIRM_TTL_HOURS * 3600_000).toISOString(),
      });
      if (error) throw error;

      const site = (Deno.env.get("SITE_URL") ?? "http://localhost:5173").replace(/\/$/, "");
      const link = `${site}/?confirm=${encodeURIComponent(token)}`;
      const title = escapeHtml(campaign.title);
      const sent = await sendMail({
        to,
        subject: `Unlock ${campaign.title}`,
        text: `Open this link to unlock your early listen of ${campaign.title}:\n\n${link}\n\nThe link works once and expires in ${CONFIRM_TTL_HOURS} hours. If you didn't ask for this, ignore this email.`,
        html: `<p>Open this link to unlock your early listen of <strong>${title}</strong>:</p><p><a href="${escapeHtml(link)}">Unlock ${title}</a></p><p>The link works once and expires in ${CONFIRM_TTL_HOURS} hours. If you didn't ask for this, ignore this email.</p>`,
      });
      await logEvent(campaign.id, fanId, "gate_email_sent");

      // Local development only: hand the link back so the flow can be tested
      // without an email provider. Never enable this in production.
      const exposeLink = !sent && Deno.env.get("DEV_EXPOSE_CONFIRM_LINK") === "true";
      return exposeLink ? { sent, devConfirmUrl: link } : { sent: true };
    }

    if (mode === "confirm") {
      const tokenHash = await sha256Hex(str(body, "token", 100));
      const { data: row, error } = await db()
        .from("email_confirmations")
        .update({ used_at: new Date().toISOString() })
        .eq("token_hash", tokenHash)
        .eq("campaign_id", campaign.id)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .select("fan_id, gate_id")
        .maybeSingle();
      if (error) throw error;
      if (!row) throw new HttpError(400, "That confirm link has expired or was already used. Enter your email again.");
      const unlockToken = await issueToken(campaign.id, row.fan_id, row.gate_id);
      await logEvent(campaign.id, row.fan_id, "gate_unlocked", { gate: "email" });
      return { token: unlockToken };
    }

    throw new HttpError(400, "Unknown mode");
  }),
);
