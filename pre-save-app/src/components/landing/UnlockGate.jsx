import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createTimeline, stagger, utils } from "animejs";
import { burst, prefersReducedMotion, track, withUtm } from "./utils";

const fmt = (t) => {
  if (!Number.isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

/* ------------------------------------------------------------ icons */

const Padlock = ({ className = "" }) => (
  <svg viewBox="0 0 48 56" className={className} aria-hidden>
    <path className="shackle" d="M14 26V16a10 10 0 0 1 20 0v10" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
    <rect x="6" y="24" width="36" height="28" rx="6" fill="currentColor" />
    <circle cx="24" cy="36" r="3.5" fill="#07070a" />
    <path d="M24 38v6" stroke="#07070a" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const RewardIcon = ({ type }) =>
  type === "listen" ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

const MiniLock = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
    <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" fill="none" />
    <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" />
  </svg>
);

/* ------------------------------------------------------- early listen */

function EarlyListen({ src, title }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const bars = useMemo(() => {
    const rnd = utils.createSeededRandom(title.length * 131);
    return Array.from({ length: 64 }, (_, i) => {
      const env = Math.sin(Math.PI * (i / 63)) * 0.6 + 0.4;
      return Math.max(0.15, (env * rnd(35, 100)) / 100);
    });
  }, [title]);

  const progress = duration ? time / duration : 0;

  const toggle = () => {
    const el = audio.current;
    if (el.paused) {
      el.play();
      track("early_listen_play");
    } else {
      el.pause();
    }
  };

  const seek = (e) => {
    const el = audio.current;
    if (!el.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    el.currentTime = utils.clamp((e.clientX - r.left) / r.width, 0, 1) * el.duration;
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause early listen" : "Play early listen"}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-black transition hover:scale-105"
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
      <div className="min-w-0 flex-1">
        <div
          className="flex h-9 cursor-pointer items-center gap-[2px]"
          onPointerDown={seek}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") audio.current.currentTime += 5;
            if (e.key === "ArrowLeft") audio.current.currentTime -= 5;
          }}
        >
          {bars.map((h, i) => (
            <span
              key={i}
              className={`h-full flex-1 rounded-full transition-colors duration-150 ${i / bars.length < progress ? "bg-[var(--accent)]" : "bg-white/20"}`}
              style={{ transform: `scaleY(${h})` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[11px] text-white/40">
          <span>{fmt(time)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
    </div>
  );
}

/* --------------------------------------------------------------- gate */

export default function UnlockGate({ campaign, isOut, unlock }) {
  const { gate } = campaign;
  const root = useRef(null);
  const { unlocked, key, fresh, error } = unlock;
  const rewards = gate.rewards.filter((r) => !(isOut && r.hideAfterRelease));
  const provider = gate.providerName || "our pre-save partner";
  const rewardUrl = (file) => `/rewards/${encodeURIComponent(key)}/${encodeURIComponent(file)}`;

  // Reveal sequence when the fan lands back here from the provider.
  useLayoutEffect(() => {
    if (!unlocked || !fresh) return;
    const el = root.current;
    const reduce = prefersReducedMotion();
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    if (reduce) return;

    const lock = el.querySelector(".gate-lock");
    const tl = createTimeline({ delay: 650, defaults: { ease: "outExpo" } })
      .add(".gate-lock .shackle", { y: [0, -9], rotate: [0, -28], duration: 500, ease: "outBack(3)" }, 0)
      .add(lock, { scale: [1, 1.15, 0], opacity: [1, 0], duration: 700, ease: "inBack(2)" }, 380)
      .call(() => {
        const r = lock.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, campaign.accent);
      }, 900)
      .add(".gate-cover", { filter: ["blur(16px) brightness(0.45)", "blur(0px) brightness(1)"], scale: [1.06, 1], duration: 1400 }, 850)
      .add(".gate-item", { opacity: [0, 1], y: [16, 0], delay: stagger(90), duration: 900 }, 1000);
    return () => tl.revert();
  }, [unlocked, fresh, campaign.accent]);

  return (
    <section id="unlock" ref={root} className="reveal relative z-10 mx-auto max-w-5xl scroll-mt-24 px-5 py-16 sm:px-8">
      <div className="reveal-item grid items-center gap-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-8 md:grid-cols-[0.85fr_1fr] md:gap-12">
        {/* Visual */}
        <div className="relative mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-xl">
          <div
            className="gate-cover h-full w-full"
            style={{ filter: unlocked ? "none" : "blur(16px) brightness(0.45)" }}
          >
            {campaign.artwork ? (
              <img src={campaign.artwork} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="generated-cover h-full w-full" />
            )}
          </div>
          {(!unlocked || fresh) && (
            <div
              className="gate-lock absolute inset-0 grid place-items-center text-white"
              style={unlocked && prefersReducedMotion() ? { display: "none" } : undefined}
            >
              <Padlock className="h-16 w-16 drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)]" />
            </div>
          )}
        </div>

        {/* Copy + actions */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">
            {unlocked ? "Unlocked" : "Fan exclusive"}
          </p>
          <h2 className="mt-3 font-display text-2xl leading-[1.05] sm:text-3xl">
            {unlocked ? "You're in. Press play." : "Hear it before anyone else."}
          </h2>

          {!unlocked && (
            <>
              <p className="mt-3 text-white/60">
                Pre-save {campaign.title} and follow {campaign.artist} to unlock:
              </p>
              <ul className="mt-5 space-y-2.5">
                {rewards.map((r) => (
                  <li key={r.file} className="flex items-center gap-3 text-white/85">
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/60">
                      <RewardIcon type={r.type} />
                    </span>
                    <span className="flex-1">{r.title}</span>
                    <span className="text-white/30">
                      <MiniLock />
                    </span>
                  </li>
                ))}
              </ul>

              <ol className="mt-7 grid grid-cols-3 gap-2 text-[11px] leading-snug text-white/50">
                {["Connect Spotify or Apple Music", "Pre-save + follow", "Come back unlocked"].map((s, i) => (
                  <li key={s} className="border-t border-white/15 pt-2">
                    <span className="font-mono text-white/80">0{i + 1}</span>
                    <br />
                    {s}
                  </li>
                ))}
              </ol>

              <a
                href={withUtm(gate.providerUrl)}
                onClick={() => track("gate_start")}
                className="mt-7 inline-flex items-center gap-3 rounded-full bg-[var(--accent)] px-6 py-3.5 font-medium text-black transition hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                <MiniLock />
                Pre-save to unlock
              </a>
              {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
              <p className="mt-4 text-xs text-white/35">
                Verified by {provider}. We never see your password.
              </p>
            </>
          )}

          {unlocked && (
            <div className="mt-6 space-y-5">
              {rewards.map((r) => (
                <div key={r.file} className="gate-item">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">{r.title}</p>
                  {r.type === "listen" ? (
                    <EarlyListen src={rewardUrl(r.file)} title={campaign.title} />
                  ) : (
                    <a
                      href={rewardUrl(r.file)}
                      download
                      onClick={() => track("reward_download", { file: r.file })}
                      className="inline-flex items-center gap-3 rounded-full border border-white/20 px-5 py-3 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      <RewardIcon type="download" />
                      Download
                    </a>
                  )}
                </div>
              ))}
              <p className="gate-item text-xs text-white/35">
                Early listen is for you. Please don't share the link.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
