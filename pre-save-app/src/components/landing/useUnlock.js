import { useEffect, useState } from "react";
import { sha256Hex, track } from "./utils";

const storageKey = (title) => `presave-unlock:${title}`;

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode: unlock still works for this visit */
    }
  },
  remove(k) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

/**
 * Secret-link unlock. The fan-gate provider redirects to ?unlock=<KEY> once
 * the fan has pre-saved / followed. We only ship sha256(KEY) in the bundle,
 * and reward files live under /rewards/<KEY>/, so they can't be located
 * without the link.
 *
 * Returns { unlocked, key, fresh, error }. `fresh` is true when the unlock
 * came from the link on this visit (play the reveal animation).
 */
export function useUnlock(gate, title) {
  const [state, setState] = useState({ unlocked: false, key: null, fresh: false, error: null });
  const enabled = Boolean(gate?.enabled && gate?.keyHash);
  const keyHash = gate?.keyHash?.toLowerCase();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("unlock");
    const candidate = fromUrl || store.get(storageKey(title));
    if (!candidate) return;

    sha256Hex(candidate)
      .then((hash) => {
        if (cancelled) return;

        // Don't leave the key in the address bar where it gets copy-pasted.
        if (fromUrl) {
          params.delete("unlock");
          const qs = params.toString();
          window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
        }

        if (hash !== keyHash) {
          if (fromUrl) {
            setState((s) => ({ ...s, error: "That unlock link isn't valid for this release." }));
          } else {
            store.remove(storageKey(title)); // stale key from an older campaign
          }
          return;
        }

        store.set(storageKey(title), candidate);
        if (fromUrl) track("gate_unlocked");
        setState({ unlocked: true, key: candidate, fresh: Boolean(fromUrl), error: null });
      })
      .catch(() => {
        // crypto.subtle needs a secure context (https or localhost).
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, keyHash, title]);

  return state;
}
