// Core per-fan unlock logic shared by the claim-* and reward-url functions.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { HttpError, clientIp } from "./http.ts";

let client: SupabaseClient | null = null;

/** Service-role client. Never expose this key to the browser. */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Constant-time comparison of two hex strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type Campaign = {
  id: string;
  title: string;
  release_date: string;
  gate_enabled: boolean;
  provider_secret_hash: string | null;
  status: string;
};

export async function loadCampaign(campaignId: string): Promise<Campaign> {
  if (!/^[0-9a-f-]{36}$/i.test(campaignId)) throw new HttpError(400, "Unknown campaign");
  const { data, error } = await db()
    .from("campaigns")
    .select("id, title, release_date, gate_enabled, provider_secret_hash, status")
    .eq("id", campaignId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "live") throw new HttpError(404, "Unknown campaign");
  return data as Campaign;
}

export async function findGate(campaignId: string, type: string): Promise<{ id: string }> {
  const { data, error } = await db()
    .from("gates")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("type", type)
    .eq("enabled", true)
    .order("position")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(400, "That unlock option isn't available for this release.");
  return data;
}

/**
 * Per-IP and per-campaign fixed-window limits. Throws 429 when exceeded.
 * Defaults: 10 calls/min per IP per function, 300 calls/min per campaign.
 */
export async function rateLimit(req: Request, fn: string, campaignId: string) {
  const perIp = Number(Deno.env.get("RATE_LIMIT_PER_IP") ?? 10);
  const perCampaign = Number(Deno.env.get("RATE_LIMIT_PER_CAMPAIGN") ?? 300);
  const ip = await sha256Hex(clientIp(req)); // don't store raw IPs
  const checks: [string, number][] = [
    [`${fn}:ip:${ip}`, perIp],
    [`${fn}:campaign:${campaignId}`, perCampaign],
  ];
  for (const [key, max] of checks) {
    const { data, error } = await db().rpc("hit_rate_limit", { p_key: key, p_max: max, p_window_seconds: 60 });
    if (error) throw error;
    if (data !== true) throw new HttpError(429, "Too many attempts. Wait a minute and try again.");
  }
}

/** Insert or update the fan row for (campaign, email). Returns the fan id. */
export async function upsertFan(
  campaignId: string,
  email: string | null,
  consent: boolean,
  source: Record<string, unknown>,
): Promise<string> {
  if (email) {
    const { data: existing, error: selErr } = await db()
      .from("fans")
      .select("id, consent_at")
      .eq("campaign_id", campaignId)
      .eq("email", email)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
      if (consent && !existing.consent_at) {
        const { error } = await db().from("fans").update({ consent_at: new Date().toISOString() }).eq("id", existing.id);
        if (error) throw error;
      }
      return existing.id;
    }
  }
  const { data, error } = await db()
    .from("fans")
    .insert({
      campaign_id: campaignId,
      email,
      consent_at: consent ? new Date().toISOString() : null,
      source,
    })
    .select("id")
    .single();
  if (error?.code === "23505" && email) {
    // Same fan submitted twice at once: the other request created the row.
    return upsertFan(campaignId, email, consent, source);
  }
  if (error) throw error;
  return data.id;
}

/** Issue a new per-fan unlock token. Only its hash is stored. */
export async function issueToken(campaignId: string, fanId: string | null, gateId: string | null): Promise<string> {
  const token = randomToken();
  const { error } = await db()
    .from("unlocks")
    .insert({ campaign_id: campaignId, fan_id: fanId, gate_id: gateId, token_hash: await sha256Hex(token) });
  if (error) throw error;
  return token;
}

export async function logEvent(campaignId: string, fanId: string | null, name: string, data: Record<string, unknown> = {}) {
  const { error } = await db().from("events").insert({ campaign_id: campaignId, fan_id: fanId, name, data });
  if (error) console.error("event insert failed", error);
}

/** Only utm_* keys, short values. */
export function cleanSource(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^utm_[a-z]{1,20}$/.test(k) && typeof v === "string") out[k] = v.slice(0, 100);
  }
  return out;
}
