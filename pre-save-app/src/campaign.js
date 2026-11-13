/**
 * Demo campaign and shape reference.
 *
 * Live campaigns come from the backend (get_public_campaign in
 * supabase/migrations), which returns this same shape plus ids. This copy is
 * used only when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set, and
 * it mirrors supabase/seed.sql. The gate is off here: rewards are only ever
 * served by the backend, per fan, through short-lived signed URLs.
 */
export const campaign = {
  id: "demo-low-tide", // stable id: storage keys, waveform seed, .ics UID
  artist: "Chris.Wave",
  title: "Low Tide",
  format: "New single", // "New single" | "EP" | "Album"
  tagline: "A slow-burning love letter to the hour after midnight.",

  // ISO 8601 with offset. Global releases go live at 00:00 local in most
  // territories; set the date your distributor confirmed.
  releaseDate: "2026-12-05T00:00:00-05:00",

  // Leave empty to use the generated gradient cover.
  artwork: "",

  accent: "#c6ff3d",

  // Primary pre-save first: it gets the hero button.
  // Spotify/Apple pre-saves need an OAuth service (e.g. your distributor's
  // pre-save tool or a smart-link provider). Paste those URLs here.
  platforms: [
    { name: "Spotify", action: "Pre-save", href: "https://open.spotify.com", primary: true },
    { name: "Apple Music", action: "Pre-add", href: "https://music.apple.com" },
    { name: "YouTube Music", action: "Notify me", href: "https://music.youtube.com" },
    { name: "Amazon Music", action: "Pre-save", href: "https://music.amazon.com" },
    { name: "Deezer", action: "Pre-save", href: "https://www.deezer.com" },
    { name: "Bandcamp", action: "Pre-order", href: "https://bandcamp.com" },
  ],

  // Shown only when set. Wire it to your real count; never hard-code a fake one.
  presaveCount: null,

  // Optional 15–30s teaser clip. The waveform plays decoratively without it.
  teaserSrc: "",

  /**
   * Fan gate (per-fan unlock). Configured in the database, not here:
   *   gates   - provider redirect (?claim=), email, access code, paid (phase 2)
   *   rewards - files in the private "rewards" storage bucket
   * Provider secrets and access codes are stored only as hashes; generate
   * them with `node scripts/campaign-secret.mjs`.
   */
  gate: {
    enabled: false,
    gates: [{ type: "provider", config: { providerName: "Hypeddit", providerUrl: "https://hypeddit.com" } }],
    rewards: [
      { id: "demo-listen", type: "listen", title: "Full track, 3 weeks early", hideAfterRelease: true },
      { id: "demo-download", type: "download", title: "Demo + stems (.zip)", hideAfterRelease: false },
    ],
  },

  socials: [
    { name: "Instagram", href: "https://instagram.com" },
    { name: "TikTok", href: "https://tiktok.com" },
    { name: "YouTube", href: "https://youtube.com" },
  ],

  label: "Independent release",
};
