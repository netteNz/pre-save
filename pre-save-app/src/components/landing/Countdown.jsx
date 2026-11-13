import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { prefersReducedMotion } from "./utils";

function Digit({ value }) {
  const ref = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (prefersReducedMotion()) return;
    const anim = animate(ref.current, {
      y: ["-0.55em", "0em"],
      opacity: [0, 1],
      filter: ["blur(4px)", "blur(0px)"],
      duration: 520,
      ease: "outExpo",
    });
    return () => anim.revert();
  }, [value]);

  return (
    <span ref={ref} className="inline-block w-[0.62em] text-center">
      {value}
    </span>
  );
}

function Unit({ value, label }) {
  const digits = String(value).padStart(2, "0").split("");
  return (
    <div className="flex flex-col items-start">
      <div className="font-mono text-3xl sm:text-4xl tabular-nums leading-none overflow-hidden py-1">
        {digits.map((d, i) => (
          <Digit key={i} value={d} />
        ))}
      </div>
      <span className="mt-2 text-[10px] uppercase tracking-[0.22em] text-white/40">
        {label}
      </span>
    </div>
  );
}

export default function Countdown({ countdown }) {
  const { days, hours, minutes, seconds } = countdown;
  return (
    <div
      className="flex items-start gap-5 sm:gap-7"
      role="timer"
      aria-label={`${days} days, ${hours} hours, ${minutes} minutes until release`}
    >
      <Unit value={days} label="Days" />
      <Sep />
      <Unit value={hours} label="Hrs" />
      <Sep />
      <Unit value={minutes} label="Min" />
      <Sep />
      <Unit value={seconds} label="Sec" />
    </div>
  );
}

const Sep = () => (
  <span className="font-mono text-3xl sm:text-4xl leading-none py-1 text-white/20" aria-hidden>
    :
  </span>
);
