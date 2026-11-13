/**
 * Campaign config: the only file you need to edit per release.
 *
 * Swap the copy, date, links and accent per campaign. Every outgoing link
 * gets the visitor's UTM params forwarded so attribution survives the hop
 * to the DSP / smart-link provider.
 */
export const campaign = {
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

  // POST target for the email capture form ({ email, consent, campaign }).
  // Leave empty during development; the form still shows its success state.
  notifyEndpoint: "",

  /**
   * Fan gate: "pre-save / follow to unlock".
   *
   * Spotify only lets approved apps act on fans' accounts at scale (since
   * Feb 2026 self-built apps are capped at 5 allowlisted users), so the
   * pre-save + follow runs on a provider that has that approval (Hypeddit
   * Link Gate, Feature.fm, LabelGrid...). When the fan finishes, the
   * provider sends them to our secret reward URL and the page unlocks.
   *
   * Setup per campaign:
   *   1. node scripts/unlock-key.mjs
   *   2. Put reward files in public/rewards/<KEY>/ (gitignored)
   *   3. In the provider, set the reward / redirect URL to
   *      https://<your-domain>/?unlock=<KEY>
   *   4. Paste the gate link into providerUrl and the hash into keyHash.
   *      Only the hash goes here, never the key.
   */
  gate: {
    enabled: true,
    providerName: "Hypeddit",
    providerUrl: "https://hypeddit.com",
    keyHash: "65827ae3898db01d51cbba385a6f8412d52a106cdf55e4a7345fe1268b223879",
    rewards: [
      { type: "listen", title: "Full track, 3 weeks early", file: "early-listen.mp3", hideAfterRelease: true },
      { type: "download", title: "Demo + stems (.zip)", file: "low-tide-extras.zip" },
    ],
  },

  socials: [
    { name: "Instagram", href: "https://instagram.com" },
    { name: "TikTok", href: "https://tiktok.com" },
    { name: "YouTube", href: "https://youtube.com" },
  ],

  label: "Independent release",
};
