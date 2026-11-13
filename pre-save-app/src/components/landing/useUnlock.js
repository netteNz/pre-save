import { useCallback, useEffect, useState } from "react";
import { ApiError, backendConfigured, callFunction, utmSource } from "../../lib/api";
import { track } from "./utils";

// Keyed on the campaign id (not the title, which collides across artists).
const storageKey = (campaignId) => `presave-unlock:${campaignId}`;
const claimKey = (campaignId) => `presave-claim:${campaignId}`;

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback; // private mode / blocked storage: unlock still works for this visit
  }
};
const local = {
  get: (k) => safe(() => localStorage.getItem(k)),
  set: (k, v) => safe(() => localStorage.setItem(k, v)),
  remove: (k) => safe(() => localStorage.removeItem(k)),
};
const session = {
  get: (k) => safe(() => sessionStorage.getItem(k)),
  set: (k, v) => safe(() => sessionStorage.setItem(k, v)),
  remove: (k) => safe(() => sessionStorage.removeItem(k)),
};

const URL_PARAMS = ["token", "confirm", "claim", "unlock"];

function readUrlParams() {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    token: p.get("token"),
    confirm: p.get("confirm"),
    // ?unlock= is the old shared-key link; treat it as a provider claim so
    // links already configured at the provider keep working.
    claim: p.get("claim") || p.get("unlock"),
  };
}

// Don't leave tokens or secrets in the address bar where they get copy-pasted.
function stripUrlParams() {
  const p = new URLSearchParams(window.location.search);
  if (!URL_PARAMS.some((k) => p.has(k))) return;
  URL_PARAMS.forEach((k) => p.delete(k));
  const qs = p.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
}

// One request per token per page load, so React StrictMode's double effect
// can't spend a single-use confirm link twice.
const inflight = new Map();
const once = (key, fn) => {
  if (!inflight.has(key)) inflight.set(key, fn());
  return inflight.get(key);
};

/**
 * Per-fan unlock.
 *
 * Every fan gets their own token, issued by a claim-* Edge Function (email
 * confirm, provider redirect + email, or access code) and stored in
 * localStorage under the campaign id. Reward files are fetched as
 * short-lived signed URLs through rewardUrl().
 *
 * URL params handled on load (then stripped from the address bar):
 *   ?confirm=<t>  email-gate confirm link   -> exchanged for a token
 *   ?token=<t>    a token (e.g. after paid checkout, phase 2)
 *   ?claim=<s>    provider redirect secret  -> held until the fan gives an email
 *
 * Returns { unlocked, fresh, error, pendingClaim, busy, claim*, rewardUrl }.
 * `fresh` is true when the unlock happened on this visit (play the reveal).
 */
export function useUnlock(campaign) {
  const campaignId = campaign?.id;
  const enabled = Boolean(campaign?.gate?.enabled && campaignId && backendConfigured);

  const [params] = useState(readUrlParams);
  const [state, setState] = useState({ unlocked: false, token: null, fresh: false, error: null });
  const [pendingClaim, setPendingClaim] = useState(null);
  const [busy, setBusy] = useState(false);

  const complete = useCallback(
    (token, fresh) => {
      local.set(storageKey(campaignId), token);
      session.remove(claimKey(campaignId));
      setPendingClaim(null);
      setState({ unlocked: true, token, fresh, error: null });
      if (fresh) track("gate_unlocked", {}, { remote: false }); // server logs it
    },
    [campaignId],
  );

  const fail = useCallback((err) => {
    setState((s) => ({ ...s, error: err instanceof ApiError ? err.message : "Something went wrong. Please try again." }));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    stripUrlParams();

    const { token: urlToken, confirm, claim } = params;
    const stored = local.get(storageKey(campaignId));

    const verify = (token) =>
      once(`verify:${token}`, () => callFunction("reward-url", { campaign: campaignId, token }));

    (async () => {
      try {
        if (confirm) {
          const { token } = await once(`confirm:${confirm}`, () =>
            callFunction("claim-email", { mode: "confirm", campaign: campaignId, token: confirm }),
          );
          if (!cancelled) complete(token, true);
          return;
        }
        if (urlToken) {
          await verify(urlToken);
          if (!cancelled) complete(urlToken, true);
          return;
        }
        if (stored) {
          try {
            await verify(stored);
            if (!cancelled) complete(stored, false);
            return;
          } catch (err) {
            if (err instanceof ApiError && err.status === 401) local.remove(storageKey(campaignId)); // revoked
            else throw err;
          }
        }
        const held = claim || session.get(claimKey(campaignId));
        if (held && !cancelled) {
          session.set(claimKey(campaignId), held);
          setPendingClaim(held);
        }
      } catch (err) {
        if (!cancelled) fail(err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, campaignId, params, complete, fail]);

  const run = useCallback(
    async (fn) => {
      setBusy(true);
      setState((s) => ({ ...s, error: null }));
      try {
        return await fn();
      } catch (err) {
        fail(err);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [fail],
  );

  /** Email gate: sends the confirm link. Resolves to { sent, devConfirmUrl? } or null. */
  const claimEmail = useCallback(
    ({ email, consent }) =>
      run(() =>
        callFunction("claim-email", { mode: "gate", campaign: campaignId, email, consent, source: utmSource() }),
      ),
    [run, campaignId],
  );

  /** Provider gate, second step: the held claim + the fan's email. */
  const claimProvider = useCallback(
    ({ email, consent }) =>
      run(async () => {
        const { token } = await callFunction("claim-provider", {
          campaign: campaignId,
          claim: pendingClaim,
          email,
          consent,
          source: utmSource(),
        });
        complete(token, true);
        return true;
      }),
    [run, campaignId, pendingClaim, complete],
  );

  /** Access-code gate. */
  const claimCode = useCallback(
    ({ code, email, consent }) =>
      run(async () => {
        const { token } = await callFunction("claim-code", {
          campaign: campaignId,
          code,
          email: email || undefined,
          consent,
          source: utmSource(),
        });
        complete(token, true);
        return true;
      }),
    [run, campaignId, complete],
  );

  /**
   * Short-lived signed URL for one reward: { url, expiresIn } (seconds).
   * Throws ApiError (e.g. 410 after release).
   */
  const rewardUrl = useCallback(
    async (rewardId) => {
      try {
        const { url, expiresIn } = await callFunction("reward-url", {
          campaign: campaignId,
          token: state.token,
          reward: rewardId,
        });
        return { url, expiresIn };
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          local.remove(storageKey(campaignId));
          setState({ unlocked: false, token: null, fresh: false, error: err.message });
        }
        throw err;
      }
    },
    [campaignId, state.token],
  );

  const dismissClaim = useCallback(() => {
    session.remove(claimKey(campaignId));
    setPendingClaim(null);
  }, [campaignId]);

  return {
    enabled,
    unlocked: state.unlocked,
    fresh: state.fresh,
    error: state.error,
    pendingClaim,
    busy,
    claimEmail,
    claimProvider,
    claimCode,
    rewardUrl,
    dismissClaim,
  };
}
