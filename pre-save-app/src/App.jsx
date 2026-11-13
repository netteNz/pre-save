import { useEffect, useState } from "react";
import PreSaveLanding from "./components/landing/PreSaveLanding";
import { backendConfigured, fetchCampaign } from "./lib/api";
import { campaign as demoCampaign } from "./campaign";

// Phase 1: a single campaign, chosen by VITE_ARTIST_SLUG / VITE_CAMPAIGN_SLUG.
// Phase 3 replaces this with the router (/:artist/:campaign).
export default function App() {
  const [state, setState] = useState(() =>
    backendConfigured ? { campaign: null, error: null } : { campaign: demoCampaign, error: null },
  );

  useEffect(() => {
    if (!backendConfigured) {
      console.warn("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set: showing demo campaign with the gate off.");
      return;
    }
    let cancelled = false;
    fetchCampaign()
      .then((campaign) => !cancelled && setState({ campaign, error: null }))
      .catch((error) => !cancelled && setState({ campaign: null, error }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.campaign) return <PreSaveLanding campaign={state.campaign} />;

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#07070a] px-5 text-center text-white/60">
      {state.error ? (
        <p role="alert">This page couldn't load. Refresh to try again.</p>
      ) : (
        <p className="animate-pulse text-sm uppercase tracking-[0.25em]">Loading</p>
      )}
    </main>
  );
}
