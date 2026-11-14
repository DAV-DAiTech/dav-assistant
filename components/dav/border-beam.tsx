"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

/**
 * Neon "border beam" that travels along the composer's rounded rectangle.
 *
 * An SVG <rect> with the same rx as the host is stroked with short dashes
 * (pathLength=100, so lengths are % of the perimeter) and only its
 * stroke-dashoffset is animated. Each beam is a stack of overlapping dashes
 * that end at the same head position, which produces a fading tail with a
 * bright head. A blurred copy underneath supplies the glow.
 *
 * The host must be `position: relative` and must not clip overflow.
 */
type Props = {
  /** Host element (the composer shell) to measure. */
  host: React.RefObject<HTMLElement | null>;
  focused: boolean;
  /** Changes on every keystroke; each change boosts the beam for 1.2s. */
  activity: number;
  /** Changes on every send; each change triggers a 400ms pulse. */
  pulse: number;
};

const CALM_PERIOD = 3200;
const TYPING_PERIOD = 1600;
const BOOST_MS = 1200;
const HEAD = 22; // primary segment length (% of perimeter)

// Layers drawn tail-first so the bright head ends up on top.
const LAYERS = [
  { len: HEAD, color: "var(--beam-tip)", opacity: 0.35 },
  { len: HEAD - 2, color: "var(--beam-to)", opacity: 0.45 },
  { len: 13, color: "var(--beam-via)", opacity: 0.75 },
  { len: 6, color: "var(--beam-from)", opacity: 1 },
  { len: 1.2, color: "#ffffff", opacity: 0.9 },
];

type Box = { w: number; h: number; r: number; b: number };

export function BorderBeam({ host, focused, activity, pulse }: Props) {
  const filterId = useId().replace(/:/g, "");
  const [box, setBox] = useState<Box | null>(null);
  const [typing, setTyping] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const boostUntil = useRef(0);
  const firstActivity = useRef(true);
  const firstPulse = useRef(true);

  // Measure the host's border box; re-runs on resize, auto-grow, docking, language.
  useLayoutEffect(() => {
    const node = host.current;
    if (!node) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const style = getComputedStyle(node);
      const next = {
        w: node.offsetWidth,
        h: node.offsetHeight,
        r: parseFloat(style.borderTopLeftRadius) || 0,
        b: parseFloat(style.borderTopWidth) || 0,
      };
      setBox((old) =>
        old && old.w === next.w && old.h === next.h && old.r === next.r && old.b === next.b
          ? old
          : next,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    window.addEventListener("resize", schedule, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [host]);

  useEffect(() => {
    if (firstActivity.current) {
      firstActivity.current = false;
      return;
    }
    boostUntil.current = performance.now() + BOOST_MS;
    setTyping(true);
    const timer = setTimeout(() => setTyping(false), BOOST_MS);
    return () => clearTimeout(timer);
  }, [activity]);

  useEffect(() => {
    if (firstPulse.current) {
      firstPulse.current = false;
      return;
    }
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 400);
    return () => clearTimeout(timer);
  }, [pulse]);

  // Travel loop: runs only while focused (or pulsing) and the tab is visible.
  useEffect(() => {
    const node = svg.current;
    if (!node || !box || !(focused || pulsing)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dashes = Array.from(node.querySelectorAll<SVGRectElement>("[data-len]"));
    let frame = 0;
    let last = 0;
    let phase = Number(node.dataset.phase || 0);
    let period = CALM_PERIOD;

    const tick = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      const goal = now < boostUntil.current ? TYPING_PERIOD : CALM_PERIOD;
      period += (goal - period) * Math.min(1, dt / 220); // ease between speeds
      phase = (phase + (dt / period) * 100) % 100;
      for (const dash of dashes) {
        // Dash occupies [head - len, head]; dashoffset of -start places it there.
        const start = phase + Number(dash.dataset.shift) + HEAD - Number(dash.dataset.len);
        dash.style.strokeDashoffset = String(-start);
      }
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      node.dataset.phase = String(phase);
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [box, focused, pulsing]);

  const state = pulsing ? "pulse" : focused ? (typing ? "typing" : "active") : "off";

  if (!box) return <svg ref={svg} className="border-beam" aria-hidden="true" />;

  // Stroke is centred on the middle of the host border.
  const inset = box.b / 2;
  const rect = {
    x: inset,
    y: inset,
    width: Math.max(0, box.w - box.b),
    height: Math.max(0, box.h - box.b),
    rx: Math.max(0, box.r - inset),
    pathLength: 100,
  };
  const beam = (shift: number, key: string) =>
    LAYERS.map((layer, i) => (
      <rect
        key={`${key}-${i}`}
        {...rect}
        data-len={layer.len}
        data-shift={shift}
        stroke={layer.color}
        strokeOpacity={layer.opacity}
        strokeDasharray={`${layer.len} ${100 - layer.len}`}
        strokeDashoffset={-(shift + HEAD - layer.len)}
      />
    ));
  const beams = (
    <>
      <g className="border-beam-primary">{beam(0, "a")}</g>
      <g className="border-beam-secondary">{beam(50, "b")}</g>
    </>
  );

  return (
    <svg
      ref={svg}
      className="border-beam"
      data-state={state}
      aria-hidden="true"
      focusable="false"
      width={box.w}
      height={box.h}
      viewBox={`0 0 ${box.w} ${box.h}`}
      style={{ top: -box.b, left: -box.b }}
    >
      <defs>
        <filter
          id={filterId}
          filterUnits="userSpaceOnUse"
          x={-40}
          y={-40}
          width={box.w + 80}
          height={box.h + 80}
        >
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <linearGradient id={`${filterId}-static`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--beam-from)" />
          <stop offset="0.5" stopColor="var(--beam-via)" />
          <stop offset="1" stopColor="var(--beam-to)" />
        </linearGradient>
      </defs>
      {/* Reduced-motion fallback: static glowing gradient border. */}
      <g className="border-beam-static">
        <rect {...rect} stroke={`url(#${filterId}-static)`} filter={`url(#${filterId})`} />
        <rect {...rect} stroke={`url(#${filterId}-static)`} />
      </g>
      <g className="border-beam-moving">
        <g className="border-beam-glow" filter={`url(#${filterId})`}>
          {beams}
        </g>
        <g className="border-beam-core">{beams}</g>
      </g>
    </svg>
  );
}
