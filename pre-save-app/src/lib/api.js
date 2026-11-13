/**
 * Thin client for the Supabase backend (plain fetch, no SDK).
 *
 * Config comes from .env.local (see .env.example). Only the public anon /
 * publishable key belongs here; service-role and Stripe keys live in Edge
 * Function secrets.
 */
const URL_BASE = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const ARTIST_SLUG = import.meta.env.VITE_ARTIST_SLUG || "chris-wave";
export const CAMPAIGN_SLUG = import.meta.env.VITE_CAMPAIGN_SLUG || "low-tide";

export const backendConfigured = Boolean(URL_BASE && ANON_KEY);

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function post(path, body) {
  if (!backendConfigured) throw new ApiError(0, "Unlocking isn't available right now.");
  let res;
  try {
    res = await fetch(`${URL_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        // Legacy anon keys are JWTs and go in Authorization too; the newer
        // sb_publishable_ keys must only be sent as apikey.
        ...(ANON_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${ANON_KEY}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error || data?.message || "Something went wrong. Please try again.");
  return data;
}

/** Public campaign payload (same shape as src/campaign.js, plus ids). */
export async function fetchCampaign(artist = ARTIST_SLUG, campaign = CAMPAIGN_SLUG) {
  const data = await post("/rest/v1/rpc/get_public_campaign", { p_artist: artist, p_campaign: campaign });
  if (!data) throw new ApiError(404, "Campaign not found");
  return data;
}

/** Calls an Edge Function: claim-email | claim-provider | claim-code | reward-url. */
export const callFunction = (name, body) => post(`/functions/v1/${name}`, body);

/** Fire-and-forget funnel event. */
export function logEvent(campaignId, name, data = {}) {
  if (!backendConfigured || !campaignId) return;
  post("/rest/v1/rpc/log_event", { p_campaign: campaignId, p_name: name, p_data: data }).catch(() => {});
}

/** The visitor's utm_* params, recorded as the fan's source. */
export function utmSource() {
  const out = {};
  if (typeof window === "undefined") return out;
  new URLSearchParams(window.location.search).forEach((v, k) => {
    if (k.startsWith("utm_")) out[k] = v;
  });
  return out;
}
