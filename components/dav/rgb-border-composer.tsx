"use client";

import { useEffect, useRef, useState } from "react";

/** Shared by the single composer as it moves between its hero and docked layouts. */
export function RgbBorderComposer({ focused, activity, pulse }: {
  focused: boolean;
  activity: number;
  pulse: number;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const [typing, setTyping] = useState(false);
  const [visible, setVisible] = useState(true);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    setRegistered(typeof CSS !== "undefined" && "registerProperty" in CSS);
    const update = () => setVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!activity) return;
    setTyping(true);
    const timer = setTimeout(() => setTyping(false), 1200);
    return () => clearTimeout(timer);
  }, [activity]);

  useEffect(() => {
    const node = root.current;
    if (!node || !focused || !visible || !registered) return;
    const orbit = node.getAnimations().find((animation) =>
      animation instanceof CSSAnimation && animation.animationName === "rgb-orbit",
    );
    if (!orbit) return;
    // Changing duration restarts CSS phase; playback rate preserves the moving colors.
    let frame = 0;
    const start = performance.now();
    const from = orbit.playbackRate;
    const to = typing ? 2 : 1;
    const easeSpeed = (now: number) => {
      const progress = Math.min(1, (now - start) / 220);
      orbit.updatePlaybackRate(from + (to - from) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(easeSpeed);
    };
    frame = requestAnimationFrame(easeSpeed);
    return () => cancelAnimationFrame(frame);
  }, [typing, focused, visible, registered]);

  return (
    <span ref={root} className="rgb-border" aria-hidden="true"
      data-focused={focused} data-typing={typing && focused}
      data-running={focused && visible} data-registered={registered}>
      <span className="rgb-border-glow"><span className="rgb-border-ring" /></span>
      <span className="rgb-border-ring rgb-border-core" />
      {pulse > 0 && <span key={pulse} className="rgb-border-pulse"><span className="rgb-border-ring" /></span>}
    </span>
  );
}
