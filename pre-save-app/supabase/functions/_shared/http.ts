// Shared HTTP helpers for the public Edge Functions.

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes("*")
    ? "*"
    : ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

/**
 * Wraps a POST JSON handler with CORS, body parsing and error mapping.
 * Unexpected errors are logged and returned as a generic 500.
 */
export function handle(fn: (req: Request, body: Record<string, unknown>) => Promise<unknown>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });
    try {
      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        throw new HttpError(400, "Invalid JSON body");
      }
      if (!body || typeof body !== "object") throw new HttpError(400, "Invalid JSON body");
      return json(req, 200, await fn(req, body));
    } catch (err) {
      if (err instanceof HttpError) return json(req, err.status, { error: err.message });
      console.error(err);
      return json(req, 500, { error: "Something went wrong. Please try again." });
    }
  };
}

export function str(body: Record<string, unknown>, key: string, max = 200): string {
  const v = body[key];
  if (typeof v !== "string" || !v.trim()) throw new HttpError(400, `Missing ${key}`);
  if (v.length > max) throw new HttpError(400, `${key} is too long`);
  return v.trim();
}

export function optStr(body: Record<string, unknown>, key: string, max = 200): string | null {
  const v = body[key];
  if (v == null || v === "") return null;
  return str(body, key, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function email(body: Record<string, unknown>): string {
  const e = str(body, "email", 254).toLowerCase();
  if (!EMAIL_RE.test(e)) throw new HttpError(400, "That email doesn't look right.");
  return e;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
