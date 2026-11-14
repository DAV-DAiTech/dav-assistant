"use client";
import { useEffect, useRef } from "react";

/**
 * Single scroll-progress line pinned to the bottom edge of the header capsule.
 *
 * - Tracks whichever container scrolled last: the page (landing view) or the
 *   inner `.message-list` (conversation view). Scroll events do not bubble, so
 *   one capture-phase listener on `document` sees both.
 * - A rAF lerp (~150ms feel) eases the bar and comet head; only `transform`
 *   and `opacity` are written, so it never triggers layout.
 * - Freezes while a modal/menu locks scroll, fades to idle 600ms after the
 *   last scroll event, and drops the spring/trail under reduced motion.
 */
const IDLE_DELAY = 600;
const SMOOTHING = 0.2; // per 16ms frame -> settles in roughly 120-180ms

function readProgress(target: Element | null) {
  const node = target ?? document.scrollingElement ?? document.documentElement;
  const range = node.scrollHeight - node.clientHeight;
  return range > 0 ? Math.min(1, Math.max(0, node.scrollTop / range)) : 0;
}

function scrollLocked() {
  return (
    document.body.style.overflow === "hidden" ||
    document.querySelector("dialog[open]") !== null
  );
}

export function ScrollProgress() {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const comet = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const line = root.current;
    if (!line || !bar.current || !comet.current) return;
    const barNode = bar.current;
    const cometNode = comet.current;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let source: Element | null = null; // null = page scroll
    let target = readProgress(null);
    let current = target;
    let frame = 0;
    let last = 0;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const paint = (value: number) => {
      barNode.style.transform = `scaleX(${value})`;
      cometNode.style.transform = `translateX(${value * 100}%)`;
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      const ease = 1 - Math.pow(1 - SMOOTHING, dt / 16);
      current += (target - current) * ease;
      if (Math.abs(target - current) < 0.0005) current = target;
      paint(current);
      frame = current === target ? 0 : requestAnimationFrame(tick);
      if (!frame) last = 0;
    };

    const onScroll = (event: Event) => {
      if (scrollLocked()) return;
      const el = event.target;
      if (el instanceof Element && el.classList.contains("message-list")) {
        source = el;
      } else if (el === document || el === document.documentElement) {
        source = null;
      } else {
        return; // ignore unrelated scrollers (tables, history list, textarea)
      }
      target = readProgress(source);
      line.dataset.state = "active";
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        line.dataset.state = "idle";
      }, IDLE_DELAY);

      if (motionQuery.matches) {
        current = target;
        paint(current);
      } else if (!frame) {
        frame = requestAnimationFrame(tick);
      }
    };

    paint(current);
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      cancelAnimationFrame(frame);
      clearTimeout(idleTimer);
    };
  }, []);

  return (
    <div ref={root} className="scroll-progress" data-state="hidden" aria-hidden="true">
      <span className="scroll-progress-track" />
      <span ref={bar} className="scroll-progress-bar" />
      <span ref={comet} className="scroll-progress-comet">
        <span className="scroll-progress-head" />
      </span>
    </div>
  );
}
