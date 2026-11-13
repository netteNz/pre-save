const BOX = "w-5 h-5 shrink-0";

export default function PlatformIcon({ name }) {
  const key = name.toLowerCase().replace(/\s+/g, "");

  // The repo's spotify/bandcamp SVGs are full wordmarks, unreadable at
  // icon size, so use compact monochrome glyphs here.
  if (key === "spotify") {
    return (
      <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
        <circle cx="12" cy="12" r="11" fill="currentColor" />
        <path d="M6.5 9.2c3.8-1.1 8-.8 11.2 1M7.2 12.4c3-.8 6.4-.5 9 .9M7.8 15.4c2.4-.6 4.9-.4 7 .7" stroke="var(--icon-cut, #07070a)" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (key === "bandcamp") {
    return (
      <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
        <path d="M0 18 7.5 6H24l-7.5 12H0Z" fill="currentColor" />
      </svg>
    );
  }
  if (key === "applemusic") {
    return (
      <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
        <path
          d="M16.365 2.004a.75.75 0 0 1 .885.737v11.522a3.816 3.816 0 1 1-1.5-3.027V6.69l-6 1.286v7.287a3.816 3.816 0 1 1-1.5-3.027V6.527a.75.75 0 0 1 .585-.73l7.53-1.636Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (key.startsWith("youtube")) {
    return (
      <svg viewBox="0 0 24 24" className={BOX} aria-hidden>
        <path
          d="M23 7.5a4 4 0 0 0-2.8-2.9C18 4 12 4 12 4s-6 0-8.2.6A4 4 0 0 0 1 7.5 41.6 41.6 0 0 0 1 12a41.6 41.6 0 0 0 .8 4.5 4 4 0 0 0 2.8 2.9C6 20 12 20 12 20s6 0 8.2-.6a4 4 0 0 0 2.8-2.9A41.6 41.6 0 0 0 23 12a41.6 41.6 0 0 0 0-4.5ZM10 15.5v-7l6 3.5-6 3.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <span
      className={`${BOX} grid place-items-center rounded-full border border-white/25 text-[10px] font-medium uppercase`}
      aria-hidden
    >
      {name.charAt(0)}
    </span>
  );
}
