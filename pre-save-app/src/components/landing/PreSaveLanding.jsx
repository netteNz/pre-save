import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  createAnimatable,
  createScope,
  createTimeline,
  stagger,
  utils,
} from "animejs";
import Countdown from "./Countdown";
import { useCountdown } from "./useCountdown";
import PlatformIcon from "./PlatformIcon";
import UnlockGate from "./UnlockGate";
import { useUnlock } from "./useUnlock";
import { burst, downloadIcs, formatReleaseDate, prefersReducedMotion, track, withUtm } from "./utils";
import "./landing.css";

const BAR_COUNT = 56;

/* ---------------------------------------------------------------- helpers */

function SplitTitle({ text }) {
  return (
    <span aria-label={text} className="block">
      {text.split(" ").map((word, w) => (
        <span key={w} aria-hidden className="inline-block overflow-hidden align-bottom pb-[0.08em] mr-[0.22em] last:mr-0">
          {word.split("").map((ch, i) => (
            <span key={i} className="char inline-block will-change-transform">
              {ch}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

/* --------------------------------------------------------------- the page */

export default function PreSaveLanding({ campaign }) {
  const root = useRef(null);
  const scope = useRef(null);
  const audio = useRef(null);

  const releaseDate = useMemo(() => new Date(campaign.releaseDate), [campaign.releaseDate]);
  const countdown = useCountdown(releaseDate);
  const isOut = countdown.done;
  const gateOn = Boolean(campaign.gate?.enabled);
  const unlock = useUnlock(campaign.gate, campaign.title);

  const [primary, ...others] = useMemo(() => {
    const list = [...campaign.platforms];
    const i = list.findIndex((p) => p.primary);
    if (i > 0) list.unshift(list.splice(i, 1)[0]);
    return list;
  }, [campaign.platforms]);

  const [saved, setSaved] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");

  // Deterministic waveform silhouette so it doesn't jump between renders.
  const bars = useMemo(() => {
    const rnd = utils.createSeededRandom(campaign.title.length * 97);
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      const t = i / (BAR_COUNT - 1);
      const envelope = Math.sin(Math.PI * t) * 0.7 + 0.3;
      return Math.max(0.12, envelope * rnd(40, 100) / 100);
    });
  }, [campaign.title]);

  /* ------------------------------------------------------ anime.js scope */
  useLayoutEffect(() => {
    scope.current = createScope({
      root,
      mediaQueries: { reduce: "(prefers-reduced-motion: reduce)" },
    }).add((self) => {
      const { reduce } = self.matches;

      // Reduced motion: everything renders in its final state, no loops.
      if (reduce) return;

      // Hide intro targets before first paint (layout effect, so no flash)
      utils.set(".fade-up", { opacity: 0 });
      utils.set(".char", { y: "115%" });
      utils.set(".cover", { opacity: 0 });
      utils.set(".bar", { scaleY: 0 });
      utils.set(".rule", { scaleX: 0 });
      utils.set(".reveal-item", { opacity: 0 });

      // Intro sequence
      const tl = createTimeline({ defaults: { ease: "outExpo", duration: 1100 } });
      tl.add(".rule", { scaleX: [0, 1], duration: 1400 }, 0)
        .add(".cover", { opacity: [0, 1], scale: [1.12, 1], filter: ["blur(18px)", "blur(0px)"], duration: 1600 }, 0)
        .add(".char", { y: ["115%", "0%"], rotate: [10, 0], delay: stagger(38) }, 250)
        .add(".fade-up", { opacity: [0, 1], y: [18, 0], delay: stagger(80) }, 600)
        .add(".vinyl", { x: ["0%", "38%"], rotate: [0, 120], duration: 1800, ease: "inOutQuart" }, 700)
        .add(".bar", { scaleY: [0, (el) => el.dataset.h], delay: stagger(14, { from: "center" }), duration: 900 }, 900);

      // Vinyl keeps spinning once it's out
      const spin = animate(".vinyl-disc", {
        rotate: "1turn",
        duration: 5200,
        ease: "linear",
        loop: true,
      });
      self.add("setSpin", (fast) => (spin.speed = fast ? 3 : 1));

      // Living waveform: random heights, refreshed on every loop
      const wave = animate(".bar", {
        scaleY: (el) => utils.clamp(Number(el.dataset.h) * utils.random(0.45, 1.25, 2), 0.08, 1),
        duration: 520,
        delay: stagger(18, { from: "center" }),
        ease: "inOutSine",
        loop: true,
        alternate: true,
        autoplay: false,
        onLoop: (a) => a.refresh(),
      });
      tl.then(() => wave.play());
      self.add("setWave", (fast) => (wave.speed = fast ? 2.4 : 1));

      // Cursor-following glow
      const glow = createAnimatable(".glow", { x: 900, y: 900, ease: "out(4)" });
      const onMove = (e) => {
        glow.x(e.clientX - window.innerWidth / 2);
        glow.y(e.clientY - window.innerHeight / 2);
      };
      window.addEventListener("pointermove", onMove);

      // Magnetic primary CTA
      const cta = root.current.querySelector(".cta");
      const mag = createAnimatable(cta, { x: 500, y: 500, ease: "outElastic(1, .6)" });
      const onCtaMove = (e) => {
        const r = cta.getBoundingClientRect();
        mag.x((e.clientX - r.left - r.width / 2) * 0.25);
        mag.y((e.clientY - r.top - r.height / 2) * 0.35);
      };
      const onCtaLeave = () => {
        mag.x(0);
        mag.y(0);
      };
      cta.addEventListener("pointermove", onCtaMove);
      cta.addEventListener("pointerleave", onCtaLeave);

      // Scroll reveals. IntersectionObserver (not anime's onScroll) so that
      // anchor jumps (#platforms, #unlock, the return from the fan gate)
      // still reveal sections they land on or skip past.
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            io.unobserve(entry.target);
            animate(entry.target.querySelectorAll(".reveal-item"), {
              opacity: [0, 1],
              y: [28, 0],
              delay: stagger(70),
              duration: 900,
              ease: "outExpo",
            });
          }),
        { rootMargin: "0px 0px -12% 0px" },
      );
      root.current.querySelectorAll(".reveal").forEach((section) => io.observe(section));

      return () => {
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        cta.removeEventListener("pointermove", onCtaMove);
        cta.removeEventListener("pointerleave", onCtaLeave);
      };
    });

    return () => scope.current.revert();
  }, []);

  /* ------------------------------------------------------------ handlers */
  const handlePlatform = (platform, e) => {
    track(isOut ? "listen_click" : "presave_click", { platform: platform.name });
    if (platform === primary) {
      const r = e.currentTarget.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, campaign.accent);
      if (!isOut) setTimeout(() => setSaved(true), 350);
    }
  };

  const toggleTeaser = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      track("teaser_play");
    } else {
      el.pause();
    }
  };

  const setPlay = (on) => {
    setPlaying(on);
    scope.current?.methods.setSpin?.(on);
    scope.current?.methods.setWave?.(on);
  };

  const share = async () => {
    const data = { title: `${campaign.artist} — ${campaign.title}`, url: window.location.href };
    track("share_click");
    try {
      if (navigator.share) return await navigator.share(data);
      await navigator.clipboard.writeText(data.url);
      setShareLabel("Link copied");
      setTimeout(() => setShareLabel("Share"), 1800);
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const subscribe = async (e) => {
    e.preventDefault();
    track("notify_signup");
    if (campaign.notifyEndpoint) {
      await fetch(campaign.notifyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, campaign: campaign.title }),
      }).catch(() => {});
    }
    setSubscribed(true);
  };

  const ctaLabel = (p) => (isOut ? "Listen" : p.action);

  /* -------------------------------------------------------------- render */
  return (
    <main
      ref={root}
      className="landing relative min-h-[100dvh] w-full overflow-x-clip bg-[#07070a] text-white"
      style={{ "--accent": campaign.accent }}
    >
      <div className="glow pointer-events-none fixed left-1/2 top-1/2 -ml-[35vmax] -mt-[35vmax] h-[70vmax] w-[70vmax] rounded-full" aria-hidden />
      <div className="grain pointer-events-none fixed inset-0" aria-hidden />

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 pt-6 sm:px-8">
        <span className="fade-up text-sm font-medium tracking-tight">{campaign.artist}</span>
        <span className="fade-up flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
          <span className="pulse h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          {isOut ? "Out now" : campaign.format}
        </span>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 px-5 pb-20 pt-6 sm:px-8 md:min-h-[calc(100dvh-4rem)] md:grid-cols-[1.05fr_1fr] md:gap-16 md:pb-10 md:pt-0">
        {/* Artwork */}
        <div className="relative mx-auto w-[58vw] max-w-[440px] md:order-last md:w-full md:-translate-x-[8%]">
          <div className="vinyl absolute inset-[4%] z-0" aria-hidden>
            <div className="vinyl-disc h-full w-full rounded-full">
              <div className="absolute inset-[34%] rounded-full bg-[var(--accent)]" />
              <div className="absolute inset-[48.5%] rounded-full bg-[#07070a]" />
            </div>
          </div>
          <div className="cover relative z-10 aspect-square w-full overflow-hidden rounded-[6px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
            {campaign.artwork ? (
              <img src={campaign.artwork} alt={`${campaign.title} cover art`} className="h-full w-full object-cover" />
            ) : (
              <div className="generated-cover flex h-full w-full flex-col justify-between p-6">
                <span className="text-[11px] uppercase tracking-[0.25em] text-black/70">{campaign.artist}</span>
                <span className="font-display text-3xl leading-[0.9] text-black sm:text-4xl">{campaign.title}</span>
              </div>
            )}
          </div>
        </div>

        {/* Copy */}
        <div>
          <p className="fade-up mb-4 flex items-center md:mb-6 gap-3 text-[11px] uppercase tracking-[0.25em] text-white/50">
            <span>{campaign.format}</span>
            <span className="rule h-px w-10 origin-left bg-white/30" />
            <span>{formatReleaseDate(releaseDate)}</span>
          </p>

          <h1 className="font-display text-[clamp(2.6rem,8.5vw,6.25rem)] font-[800] leading-[0.92]">
            <SplitTitle text={campaign.title} />
          </h1>

          <p className="fade-up mt-4 max-w-md md:mt-6 text-base leading-relaxed text-white/60">{campaign.tagline}</p>

          <div className="fade-up mt-7 md:mt-10">
            {isOut ? (
              <p className="font-display text-2xl text-[var(--accent)] sm:text-4xl">Out everywhere now.</p>
            ) : (
              <Countdown countdown={countdown} />
            )}
          </div>

          <div className="fade-up mt-7 flex flex-wrap md:mt-10 items-center gap-x-6 gap-y-4">
            <a
              href={withUtm(primary.href)}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => handlePlatform(primary, e)}
              className="cta group inline-flex items-center gap-3 rounded-full bg-[var(--accent)] py-4 pl-5 pr-6 font-medium text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            >
              <span className="text-black [--icon-cut:var(--accent)]">
                <PlatformIcon name={primary.name} />
              </span>
              {ctaLabel(primary)} on {primary.name}
              <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </a>
            <a href="#platforms" className="text-sm text-white/60 underline-offset-4 transition hover:text-white hover:underline">
              Other platforms
            </a>
          </div>

          {gateOn && !unlock.unlocked && (
            <a href="#unlock" className="fade-up mt-5 inline-flex items-center gap-2 text-sm text-[var(--accent)] underline-offset-4 hover:underline">
              Pre-save to unlock an early listen
              <span aria-hidden>↓</span>
            </a>
          )}

          {campaign.presaveCount != null && (
            <p className="fade-up mt-6 text-sm text-white/40">
              <span className="text-white/80">{campaign.presaveCount.toLocaleString()}</span> fans already{" "}
              {isOut ? "saved it" : "pre-saved"}
            </p>
          )}

          {/* Waveform / teaser */}
          <div className="fade-up mt-12 flex items-center gap-4">
            {campaign.teaserSrc && (
              <>
                <button
                  type="button"
                  onClick={toggleTeaser}
                  aria-label={playing ? "Pause teaser" : "Play teaser"}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 transition hover:border-white/60"
                >
                  {playing ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                      <path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" aria-hidden>
                      <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
                    </svg>
                  )}
                </button>
                <audio
                  ref={audio}
                  src={campaign.teaserSrc}
                  preload="none"
                  onPlay={() => setPlay(true)}
                  onPause={() => setPlay(false)}
                  onEnded={() => setPlay(false)}
                />
              </>
            )}
            <div className="flex h-10 flex-1 items-center gap-[3px]" aria-hidden>
              {bars.map((h, i) => (
                <span
                  key={i}
                  data-h={h.toFixed(2)}
                  className={`bar h-full flex-1 origin-center rounded-full ${playing ? "bg-[var(--accent)]" : "bg-white/25"}`}
                  style={{ transform: `scaleY(${h})` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {gateOn && <UnlockGate campaign={campaign} isOut={isOut} unlock={unlock} />}

      {/* All platforms */}
      <section id="platforms" className="reveal relative z-10 mx-auto max-w-3xl px-5 py-24 sm:px-8">
        <h2 className="reveal-item mb-2 text-[11px] uppercase tracking-[0.25em] text-white/50">
          {isOut ? "Listen on" : "Pick your platform"}
        </h2>
        <p className="reveal-item mb-10 font-display text-2xl sm:text-4xl">
          {isOut ? "Wherever you listen." : "Be there the second it drops."}
        </p>
        <ul className="border-t border-white/10">
          {[primary, ...others].map((p) => (
            <li key={p.name} className="reveal-item border-b border-white/10">
              <a
                href={withUtm(p.href)}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => handlePlatform(p, e)}
                className="row group flex items-center justify-between gap-4 py-5 focus:outline-none focus-visible:bg-white/5"
              >
                <span className="flex items-center gap-4 text-white/85">
                  <PlatformIcon name={p.name} />
                  <span className="text-lg">{p.name}</span>
                </span>
                <span className="flex items-center gap-3 text-sm text-white/50 transition group-hover:text-[var(--accent)]">
                  {ctaLabel(p)}
                  <svg viewBox="0 0 24 24" className="h-4 w-4 -translate-x-1 transition-transform duration-300 group-hover:translate-x-0" aria-hidden>
                    <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Release-day notification: own the fan relationship */}
      {!isOut && (
        <section className="reveal relative z-10 mx-auto max-w-3xl px-5 pb-28 sm:px-8">
          <div className="reveal-item rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10">
            {subscribed ? (
              <div>
                <p className="font-display text-2xl">You're on the list.</p>
                <p className="mt-2 text-white/60">
                  One email on release day, then the occasional heads-up from {campaign.artist}.
                </p>
              </div>
            ) : (
              <form onSubmit={subscribe}>
                <p className="font-display text-2xl sm:text-3xl">Not on a streaming app?</p>
                <p className="mt-2 text-white/60">Get one email the moment it's out, plus early news from {campaign.artist}.</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="flex-1 rounded-full border border-white/15 bg-transparent px-5 py-3.5 text-white placeholder:text-white/30 focus:border-[var(--accent)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-white px-6 py-3.5 font-medium text-black transition hover:bg-[var(--accent)]"
                  >
                    Notify me
                  </button>
                </div>
                <label className="mt-4 flex items-start gap-3 text-xs text-white/50">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  I agree to receive emails from {campaign.artist}. Unsubscribe anytime.
                </label>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative z-10 mx-auto flex max-w-6xl flex-col gap-4 border-t border-white/10 px-5 py-8 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} {campaign.artist} · {campaign.label}</span>
        <nav className="flex gap-5">
          {campaign.socials.map((s) => (
            <a key={s.name} href={s.href} target="_blank" rel="noreferrer noopener" className="transition hover:text-white">
              {s.name}
            </a>
          ))}
        </nav>
      </footer>

      {/* Post pre-save confirmation */}
      {saved && (
        <Confirmation
          campaign={campaign}
          releaseDate={releaseDate}
          shareLabel={shareLabel}
          onShare={share}
          gateOn={gateOn && !unlock.unlocked}
          onClose={() => setSaved(false)}
        />
      )}
    </main>
  );
}

/* ---------------------------------------------------------- confirmation */

function Confirmation({ campaign, releaseDate, shareLabel, onShare, onClose, gateOn }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const tl = createTimeline({ defaults: { ease: "outExpo" } })
      .add(ref.current, { y: ["110%", "0%"], duration: 900 })
      .add(ref.current.querySelectorAll(".sheet-item"), { opacity: [0, 1], y: [12, 0], delay: stagger(60), duration: 700 }, 250);
    return () => tl.revert();
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-6" role="dialog" aria-live="polite" aria-label="Pre-save confirmed">
      <div ref={ref} className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#121216]/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="sheet-item text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">Pre-save started</p>
            <p className="sheet-item mt-2 font-display text-xl sm:text-2xl">
              {campaign.title} lands in your library on {formatReleaseDate(releaseDate)}.
            </p>
            {gateOn && (
              <p className="sheet-item mt-2 text-sm text-white/60">
                Want it early?{" "}
                <a href="#unlock" onClick={onClose} className="text-[var(--accent)] underline underline-offset-4">
                  Finish on {campaign.gate.providerName || "the pre-save page"} to unlock your early listen
                </a>
                .
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="sheet-item -mr-2 -mt-2 p-2 text-white/40 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="sheet-item mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => {
              track("calendar_add");
              downloadIcs({ artist: campaign.artist, title: campaign.title, date: releaseDate, url: window.location.href });
            }}
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-[var(--accent)]"
          >
            Add to calendar
          </button>
          <button onClick={onShare} className="rounded-full border border-white/20 px-5 py-3 text-sm transition hover:border-white/60">
            {shareLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
