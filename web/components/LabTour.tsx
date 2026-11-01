"use client";
import { useEffect, useState } from "react";

export const TOUR_STEPS = [
  {
    target: "lab-pair",
    title: "1. Choose your companies",
    text: "Click either pair. Every chart, strategy result and export uses the same 5,032-session history.",
    action: "Choose a company pair",
  },
  {
    target: "lab-rule",
    title: "2. Choose a trading rule",
    text: "Select a strategy. Pair rules buy and short; stock rotation holds one company and carries market exposure.",
    action: "Select a strategy",
  },
  {
    target: "lab-chart",
    title: "3. Travel to a past day",
    text: "Click the chart or move its date slider. That becomes the decision date for your replay.",
    action: "Pick a historical day",
  },
  {
    target: "lab-replay",
    title: "4. Make a simulated trade",
    text: "Choose a position and holding period, then press Run replay. The fill is the following close and the outcome includes costs.",
    action: "Run a historical replay",
  },
  {
    target: "lab-compare",
    title: "5. Put the return in context",
    text: "Compare all ten rules. Check drawdown and losses alongside return, and distinguish stock rotation from a long/short pair.",
    action: "Open the strategy comparison",
  },
  {
    target: "lab-export",
    title: "6. Take the analysis with you",
    text: "The report and Excel workbook carry your selected method, transaction cost and replay. Excel includes the P/L formulas.",
    action: "Ready to explore",
  },
];
export default function LabTour({
  step,
  complete,
  onNext,
  onSkip,
}: {
  step: number;
  complete: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [viewport, setViewport] = useState({ width: 1280, height: 800 });
  useEffect(() => {
    const target = document.getElementById(TOUR_STEPS[step].target);
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
    const update = () => {
      if (target) {
        const r = target.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      window.removeEventListener("keydown", key);
    };
  }, [step, onSkip]);
  const info = TOUR_STEPS[step],
    width = Math.min(340, viewport.width - 32),
    left = rect
      ? Math.max(16, Math.min(rect.left, viewport.width - width - 16))
      : 16;
  const below = rect ? rect.top + rect.height + 14 : 100;
  const top =
    below + 248 < viewport.height
      ? below
      : Math.max(16, rect ? rect.top - 248 : 16);
  return (
    <div className="lab-tour" aria-label="Guided walkthrough">
      {rect && (
        <div
          className="tour-spotlight"
          style={{
            top: rect.top - 5,
            left: rect.left - 5,
            width: rect.width + 10,
            height: rect.height + 10,
          }}
        />
      )}
      <section
        className="tour-popover"
        style={{ left, top, width }}
        role="dialog"
        aria-labelledby="tour-title"
      >
        <div className="tour-top">
          <span>
            WALKTHROUGH · {step + 1} / {TOUR_STEPS.length}
          </span>
          <button onClick={onSkip} aria-label="Skip tutorial">
            Skip ×
          </button>
        </div>
        <h2 id="tour-title">{info.title}</h2>
        <p>{info.text}</p>
        <div className="tour-progress">
          {TOUR_STEPS.map((_, i) => (
            <i key={i} className={i <= step ? "filled" : ""} />
          ))}
        </div>
        <button
          className="lab-primary"
          disabled={!complete && step < 5}
          onClick={onNext}
        >
          {step === 5
            ? "Finish walkthrough ✓"
            : complete
              ? "Done · next step →"
              : info.action}
        </button>
      </section>
    </div>
  );
}
