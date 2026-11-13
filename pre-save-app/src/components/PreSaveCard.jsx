import React from "react";

/**
 * PreSaveCard
 * A responsive pre-save landing card inspired by popular smart links.
 *
 * Tech: React + Tailwind (no external UI kit required).
 * Drop this file anywhere under src/components and import it.
 */
import spotifyLogo from "../assets/spotify.svg";
import bandcampLight from "../assets/bandcamp_light.svg";
import BrandLogo from "./BrandLogo";

// Standardized logo box so different logo aspect ratios look consistent
const ICON_BOX = "w-5 h-5 shrink-0";

const BrandIcon = ({ name }) => {
  const raw = `${name || ""}`;
  const normalized = raw.toLowerCase().replace(/\s+/g, "");

  // Prefer provided assets
  if (normalized === "spotify") {
    return <img src={spotifyLogo} alt="Spotify" className={`${ICON_BOX} object-contain`} />;
  }
  if (normalized === "bandcamp") {
    return <img src={bandcampLight} alt="Bandcamp" className={`${ICON_BOX} object-contain`} />;
  }

  // Temporary inline fallbacks until assets are added
  switch (normalized) {
    case "applemusic":
      return (
        <svg viewBox="0 0 24 24" className={ICON_BOX} aria-hidden>
          <path d="M16.365 2.004a.75.75 0 0 1 .885.737v11.522a3.816 3.816 0 1 1-1.5-3.027V6.69l-6 1.286v7.287a3.816 3.816 0 1 1-1.5-3.027V6.527a.75.75 0 0 1 .585-.73l7.53-1.636Z" fill="currentColor"/>
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={ICON_BOX} aria-hidden>
          <path d="M23 7.5a4 4 0 0 0-2.8-2.9C18 4 12 4 12 4s-6 0-8.2.6A4 4 0 0 0 1 7.5 41.6 41.6 0 0 0 1 12a41.6 41.6 0 0 0 .8 4.5 4 4 0 0 0 2.8 2.9C6 20 12 20 12 20s6 0 8.2-.6a4 4 0 0 0 2.8-2.9A41.6 41.6 0 0 0 23 12a41.6 41.6 0 0 0 0-4.5ZM10 15.5v-7l6 3.5-6 3.5Z" fill="currentColor"/>
        </svg>
      );
    default:
      // Safe, neutral fallback monogram
      return (
        <span className={`${ICON_BOX} grid place-items-center rounded-sm bg-white/10 text-[10px] font-semibold uppercase`}>
          {raw.trim().charAt(0) || "?"}
        </span>
      );
  }
};

const PlayGlyph = () => (
  <div className="absolute inset-0 flex items-center justify-center">
    <span className="inline-flex items-center justify-center w-16 h-16 bg-white/80 text-gray-900 rounded-full shadow-lg backdrop-blur">
      <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden>
        <path d="M8 5v14l11-7L8 5Z" fill="currentColor"/>
      </svg>
    </span>
  </div>
);

// Brand row uses the logo directly (SVG/img acts as the box)
const BrandRow = ({ brand, href, onClick }) => (
  <a
    href={href}
    onClick={onClick}
    target="_blank"
    rel="noreferrer noopener"
    className="group flex items-center justify-between w-full px-4 py-4 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition"
  >
    <div className="flex items-center gap-3 text-white/90">
      <BrandLogo name={brand} size={20} className="text-white/80" />
      <span className="text-label font-medium">{brand}</span>
    </div>
    <div className="flex items-center gap-2 text-white/70">
      <span className="text-caption tracking-wide opacity-80">PLAY</span>
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
        <path d="M8 5v14l11-7L8 5Z" fill="currentColor"/>
      </svg>
    </div>
  </a>
);

export default function PreSaveCard({
  artwork,
  title = "The Love Song",
  artist = "Artist Name",
  links = [
    { brand: "Spotify", href: "#" },
    { brand: "Apple Music", href: "#" },
    { brand: "YouTube", href: "#" },
    { brand: "pandora", href: "#" },
    { brand: "deezer", href: "#" },
  ],
  background =
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2000&auto=format&fit=crop",
}) {
  return (
    <div className="min-h-[100dvh] w-full bg-black text-white relative overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-70"
        style={{ backgroundImage: `url(${background})` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/60 to-black" />

      {/* Centered container */}
      <div className="flex justify-center items-center min-h-[100dvh] px-4 py-12">
        {/* Card */}
        <div className="mx-auto w-full max-w-md md:max-w-lg rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-neutral-950/70 backdrop-blur">
          <div className="relative aspect-[1/1] w-full overflow-hidden">
            <img
              src={artwork}
              alt="Artwork"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <PlayGlyph />
          </div>

          {/* Title bar */}
          <div className="px-5 py-4 bg-neutral-900/90 border-t border-white/10">
            <h2 className="text-title font-semibold">{title}</h2>
            <p className="text-caption text-white/70 mt-0.5">{artist}</p>
          </div>

          {/* Brand rows */}
          <div className="p-3 flex flex-col gap-2">
            {links.map((l, i) => (
              <BrandRow key={i} brand={l.brand} href={l.href} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreSaveCardPhoneInner({ artwork, title, artist, links }) {
  return (
    <div className="bg-neutral-950 text-white">
      <div className="relative aspect-[9/16] w-full">
        <img
          src={artwork}
          alt="Artwork"
          className="absolute inset-0 h-1/2 w-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-0 left-0 right-0 h-1/2">
          <PlayGlyph />
        </div>
        <div className="absolute top-1/2 left-0 right-0 bg-neutral-900/95 border-t border-white/10">
          <div className="px-4 pt-3 pb-2 text-center">
            <h3 className="text-title-sm font-semibold">{title}</h3>
            <p className="text-caption text-white/70">{artist}</p>
          </div>
          <div className="p-2 flex flex-col gap-2">
            {links.map((l, i) => (
              <BrandRow key={i} brand={l.brand} href={l.href} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Example usage (remove this and render <PreSaveCard ... /> from your App):
export const Demo = () => (
  <PreSaveCard
    artwork="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1280&auto=format&fit=crop"
    title="Song"
    artist="Chris.Wave"
    links={[
      { brand: "Spotify", href: "https://open.spotify.com" },
      { brand: "Apple Music", href: "https://music.apple.com" },
      { brand: "YouTube", href: "https://youtube.com" },
      { brand: "pandora", href: "https://pandora.com" },
      { brand: "deezer", href: "https://deezer.com" },
    ]}
  />
);
