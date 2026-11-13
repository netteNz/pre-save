import { animate, utils } from "animejs";

// Forward the visitor's utm_* params onto outgoing links so attribution
// survives the jump from the landing page to the DSP.
export function withUtm(href) {
  if (typeof window === "undefined") return href;
  try {
    const url = new URL(href);
    const here = new URLSearchParams(window.location.search);
    here.forEach((value, key) => {
      if (key.startsWith("utm_") && !url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  } catch {
    return href;
  }
}

// Pushes to GTM's dataLayer when present; no-op otherwise.
export function track(event, data = {}) {
  if (typeof window === "undefined") return;
  (window.dataLayer = window.dataLayer || []).push({ event, ...data });
}

export function formatReleaseDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// Release-day calendar reminder: one of the cheapest ways to convert a
// pre-save visitor into a day-one stream.
export function downloadIcs({ artist, title, date, url }) {
  const stamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(date.getTime() + 30 * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//presave//EN",
    "BEGIN:VEVENT",
    `UID:${stamp(date)}-${title.replace(/\W+/g, "")}@presave`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(date)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${artist} — ${title} is out`,
    `DESCRIPTION:Listen now: ${url}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Particle burst from a point on screen (used by the CTA and the unlock).
export function burst(x, y, color) {
  if (prefersReducedMotion()) return;
  const layer = document.createElement("div");
  layer.className = "burst-layer";
  const dots = Array.from({ length: 22 }, () => {
    const d = document.createElement("span");
    d.className = "burst-dot";
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    d.style.background = color;
    layer.appendChild(d);
    return d;
  });
  document.body.appendChild(layer);
  animate(dots, {
    x: () => utils.random(-160, 160),
    y: () => utils.random(-180, 60),
    scale: [{ to: () => utils.random(0.8, 1.6, 2), duration: 120 }, { to: 0 }],
    opacity: [1, 0],
    duration: () => utils.random(700, 1200),
    ease: "outExpo",
    onComplete: () => layer.remove(),
  });
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
