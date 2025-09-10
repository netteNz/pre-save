import React from "react";

/**
 * PreSaveCard
 * A responsive pre-save landing card inspired by popular smart links.
 *
 * Tech: React + Tailwind (no external UI kit required).
 * Drop this file anywhere under src/components and import it.
 */

const BrandIcon = ({ name }) => {
  const common = "w-5 h-5 shrink-0";
  switch (name.toLowerCase()) {
    case "spotify":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path d="M12 0a12 12 0 1 0 12 12A12.014 12.014 0 0 0 12 0Zm5.507 17.356a.75.75 0 0 1-1.036.247c-2.841-1.733-6.42-2.127-10.632-1.17a.75.75 0 0 1-.335-1.463c4.557-1.041 8.487-.59 11.536 1.272a.75.75 0 0 1 .467 1.114Zm1.381-3.088a.94.94 0 0 1-1.3.31c-3.25-1.997-8.207-2.58-12.052-1.418a.94.94 0 0 1-1.122-.64.94.94 0 0 1 .64-1.122c4.348-1.31 9.787-.66 13.44 1.58a.94.94 0 0 1 .394 1.29ZM19.92 10a1.12 1.12 0 0 1-1.556.371c-3.712-2.289-9.367-2.5-12.72-1.39A1.12 1.12 0 0 1 4.66 7.225c3.918-1.302 10.163-1.053 14.383 1.559A1.12 1.12 0 0 1 19.921 10Z" fill="currentColor"/>
        </svg>
      );
    case "apple music":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path d="M16.365 2.004a.75.75 0 0 1 .885.737v11.522a3.816 3.816 0 1 1-1.5-3.027V6.69l-6 1.286v7.287a3.816 3.816 0 1 1-1.5-3.027V6.527a.75.75 0 0 1 .585-.73l7.53-1.636Z" fill="currentColor"/>
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path d="M23.5 6.5a4 4 0 0 0-2.8-2.8C18.9 3 12 3 12 3s-6.9 0-8.7.7A4 4 0 0 0 .5 6.5 41 41 0 0 0 0 12a41 41 0 0 0 .5 5.5 4 4 0 0 0 2.8 2.8C6.1 21 12 21 12 21s6.9 0 8.7-.7a4 4 0 0 0 2.8-2.8A41 41 0 0 0 24 12a41 41 0 0 0-.5-5.5ZM9.75 15.5v-7l6 3.5-6 3.5Z" fill="currentColor"/>
        </svg>
      );
    case "pandora":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path d="M6 3h6.5a6.5 6.5 0 0 1 0 13H9v5H6V3Z" fill="currentColor"/>
        </svg>
      );
    case "deezer":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path d="M2 16h4v3H2v-3Zm5-5h4v8H7V11Zm5-3h4v11h-4V8Zm5-3h4v14h-4V5Z" fill="currentColor"/>
        </svg>
      );
    default:
      return null;
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

const BrandRow = ({ brand, href, onClick }) => (
  <a
    href={href}
    onClick={onClick}
    target="_blank"
    rel="noreferrer noopener"
    className="group flex items-center justify-between w-full px-4 py-4 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition"
  >
    <div className="flex items-center gap-3 text-white/90">
      <BrandIcon name={brand} />
      <span className="text-sm font-medium">{brand}</span>
    </div>
    <div className="flex items-center gap-2 text-white/70">
      <span className="text-xs tracking-wide opacity-80">PLAY</span>
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
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-70"
        style={{ backgroundImage: `url(${background})` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/60 to-black" />

      {/* Centered container */}
      <div className="flex justify-center items-center min-h-screen px-4 py-12">
        {/* Card */}
        <div className="mx-auto w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-neutral-950/70 backdrop-blur">
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
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
            <p className="text-xs text-white/70 mt-0.5">{artist}</p>
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
            <h3 className="text-sm font-semibold leading-tight">{title}</h3>
            <p className="text-[11px] text-white/70">{artist}</p>
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
