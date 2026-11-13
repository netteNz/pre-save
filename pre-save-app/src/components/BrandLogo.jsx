import React from "react";

import spotify from "../assets/spotify.svg";
import bandcampLight from "../assets/bandcamp_light.svg";
// Add more brand assets here as you add files:
// import appleMusic from "../assets/apple-music.svg";
// import youtube from "../assets/youtube.svg";

const MAP = {
  spotify,
  bandcamp: bandcampLight,
};

export default function BrandLogo({ name = "", size = 20, className = "" }) {
  const key = String(name).toLowerCase().replace(/\s+/g, "");
  const src = MAP[key];

  if (src) {
    // Use the SVG file as the sizing box (no wrapper).
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`inline-block align-middle object-contain ${className}`}
        draggable="false"
      />
    );
  }

  // Neutral fallback: simple vector glyph sized directly by the SVG element
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={name || "brand"}
      className={`inline-block align-middle ${className}`}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
    </svg>
  );
}