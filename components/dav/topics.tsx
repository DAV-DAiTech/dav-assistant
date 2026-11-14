"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { text, type Language } from "@/lib/frontend/i18n";
import { suggestions } from "@/lib/frontend/suggestions";
import {
  getCenteredScroll,
  getScrollMetrics,
  getTopicIndex,
} from "@/lib/frontend/topic-navigation";

export function TopicSuggestions({
  language,
  topic,
  setTopic,
  send,
}: {
  language: Language;
  topic: number;
  setTopic: (index: number) => void;
  send: (input: string) => void;
}) {
  const t = text[language];
  const reduced = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([]);
  const momentum = useRef(0);
  const dragged = useRef(false);
  const drag = useRef<{
    id: number;
    start: number;
    left: number;
    x: number;
    time: number;
    velocity: number;
  } | null>(null);
  const [edges, setEdges] = useState({
    left: false,
    right: false,
    progress: 0,
    fraction: 1,
  });
  const current = suggestions[topic];
  const Icon = current.icon;

  useEffect(() => {
    const node = viewport.current;
    const contents = track.current;
    if (!node || !contents) return;
    let frame = 0;
    let wheelIdle: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      frame = 0;
      const next = getScrollMetrics(
        node.scrollLeft,
        node.clientWidth,
        node.scrollWidth,
      );
      setEdges((previous) =>
        Object.keys(next).every(
          (key) =>
            next[key as keyof typeof next] ===
            previous[key as keyof typeof previous],
        )
          ? previous
          : next,
      );
    };
    // Read geometry next frame; never resize an observed element during delivery.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY))
        return;
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? node.clientWidth
            : 1);
      const max = node.scrollWidth - node.clientWidth;
      if (
        (delta > 0 && node.scrollLeft < max - 1) ||
        (delta < 0 && node.scrollLeft > 1)
      ) {
        event.preventDefault();
        cancelAnimationFrame(momentum.current);
        delete node.dataset.coasting;
        // Programmatic wheel deltas must accumulate before scroll-snap settles.
        node.dataset.freeScroll = "true";
        clearTimeout(wheelIdle);
        node.scrollBy({ left: delta, behavior: "instant" });
        wheelIdle = setTimeout(() => {
          delete node.dataset.freeScroll;
        }, 160);
      }
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    observer.observe(contents);
    node.addEventListener("scroll", schedule, { passive: true });
    node.addEventListener("wheel", wheel, { passive: false });
    schedule();
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", schedule);
      node.removeEventListener("wheel", wheel);
      clearTimeout(wheelIdle);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(momentum.current);
    };
  }, []);

  useEffect(() => {
    const node = viewport.current;
    const tab = tabs.current[topic];
    if (!node || !tab) return;
    const frame = requestAnimationFrame(() => {
      // Horizontal-only centering avoids moving the hero beneath the fixed header.
      const bounds = node.getBoundingClientRect();
      const target = tab.getBoundingClientRect();
      node.scrollTo({
        left: getCenteredScroll(
          node.scrollLeft,
          bounds.left,
          node.clientWidth,
          target.left,
          target.width,
          node.scrollWidth,
        ),
        behavior: reduced ? "instant" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [topic, language, reduced]);

  function focusTopic(index: number) {
    const node = viewport.current;
    const tab = tabs.current[index];
    if (!node || !tab) return;
    tab.focus({ preventScroll: true });
    const bounds = node.getBoundingClientRect();
    const target = tab.getBoundingClientRect();
    node.scrollTo({
      left: getCenteredScroll(node.scrollLeft, bounds.left, node.clientWidth, target.left, target.width, node.scrollWidth),
      behavior: reduced ? "instant" : "smooth",
    });
    // A destination receives roving focus without changing the selected question set.
    if (!suggestions[index].url) setTopic(index);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    cancelAnimationFrame(momentum.current);
    delete event.currentTarget.dataset.coasting;
    dragged.current = false;
    drag.current = {
      id: event.pointerId,
      start: event.clientX,
      x: event.clientX,
      left: event.currentTarget.scrollLeft,
      time: performance.now(),
      velocity: 0,
    };
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    if (!dragged.current && Math.abs(event.clientX - state.start) < 5) return;
    dragged.current = true;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
    const now = performance.now();
    state.velocity = (state.x - event.clientX) / Math.max(1, now - state.time);
    state.x = event.clientX;
    state.time = now;
    event.currentTarget.scrollLeft = state.left + state.start - event.clientX;
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    drag.current = null;
    const node = event.currentTarget;
    if (node.hasPointerCapture(event.pointerId))
      node.releasePointerCapture(event.pointerId);
    delete node.dataset.dragging;
    if (!dragged.current || reduced || event.type === "pointercancel") return;
    let velocity =
      performance.now() - state.time > 100
        ? 0
        : Math.max(-2.5, Math.min(2.5, state.velocity));
    node.dataset.coasting = "true";
    let previous = performance.now();
    const coast = (now: number) => {
      const elapsed = Math.min(32, now - previous);
      previous = now;
      velocity *= Math.pow(0.92, elapsed / 16);
      const before = node.scrollLeft;
      node.scrollBy({ left: velocity * elapsed, behavior: "instant" });
      if (Math.abs(velocity) > 0.04 && Math.abs(node.scrollLeft - before) > 0.1)
        momentum.current = requestAnimationFrame(coast);
      else delete node.dataset.coasting;
    };
    momentum.current = requestAnimationFrame(coast);
  }
  function scroll(direction: number) {
    cancelAnimationFrame(momentum.current);
    if (viewport.current) {
      delete viewport.current.dataset.coasting;
      delete viewport.current.dataset.freeScroll;
      viewport.current.scrollBy({
        left: direction * 240,
        behavior: reduced ? "instant" : "smooth",
      });
    }
  }

  return (
    <section id="topics" className="topics-section" aria-label={t.topics}>
      <div className="section-kicker">
        <span>
          <Sparkles className="tiny-spark" size={14} />
          {t.popular}
        </span>
        <span className="suggestion-hint">{t.suggestionHint}</span>
      </div>
      <div
        className="topic-carousel"
        data-left={edges.left}
        data-right={edges.right}
      >
        <button
          className="topic-arrow topic-arrow-left"
          type="button"
          aria-label={t.previousTopics}
          aria-controls="topic-tablist"
          aria-hidden={!edges.left}
          tabIndex={edges.left ? 0 : -1}
          disabled={!edges.left}
          onClick={() => scroll(-1)}
        >
          <ChevronLeft size={20} />
        </button>
        <div
          className="topic-viewport"
          ref={viewport}
          data-lenis-prevent
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={(event) => {
            if (!dragged.current) endDrag(event);
          }}
          onClickCapture={(event) => {
            if (dragged.current) {
              event.preventDefault();
              event.stopPropagation();
              dragged.current = false;
            }
          }}
        >
          <div
            className="topic-tabs"
            id="topic-tablist"
            role="tablist"
            aria-label={t.topics}
            aria-orientation="horizontal"
            ref={track}
          >
            {suggestions.map((item, index) => item.url ? (
              <a
                key={item.id}
                ref={(node) => { tabs.current[index] = node; }}
                className="topic-external-link"
                href={item.url}
                role="link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.openClubMatch}
                title="DAV Club Match"
                onDragStart={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                  if (event.key === " ") {
                    event.preventDefault();
                    event.currentTarget.click();
                    return;
                  }
                  const next = getTopicIndex(event.key, index, suggestions.length);
                  if (next === null) return;
                  event.preventDefault();
                  focusTopic(next);
                }}
              >
                <item.icon size={20} strokeWidth={2.25} />
                <span>{item.label[language]}</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            ) : (
              <button
                key={item.id}
                type="button"
                role="tab"
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                id={`tab-${item.id}`}
                aria-controls="topic-panel"
                aria-selected={topic === index}
                tabIndex={topic === index ? 0 : -1}
                onClick={() => setTopic(index)}
                onKeyDown={(event) => {
                  const next = getTopicIndex(
                    event.key,
                    index,
                    suggestions.length,
                  );
                  if (next === null) return;
                  event.preventDefault();
                  focusTopic(next);
                }}
              >
                {topic === index && (
                  <motion.span
                    className="topic-indicator"
                    layoutId="topic-indicator"
                    transition={{
                      duration: reduced ? 0 : 0.35,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                )}
                <item.icon size={20} strokeWidth={2.25} />
                <span>{item.label[language]}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          className="topic-arrow topic-arrow-right"
          type="button"
          aria-label={t.nextTopics}
          aria-controls="topic-tablist"
          aria-hidden={!edges.right}
          tabIndex={edges.right ? 0 : -1}
          disabled={!edges.right}
          onClick={() => scroll(1)}
        >
          <ChevronRight size={20} />
        </button>
        <div
          className="topic-progress"
          aria-hidden="true"
          data-overflow={edges.fraction < 1}
        >
          <span
            style={{
              width: `${edges.fraction * 100}%`,
              transform: `translateX(${((edges.progress * (1 - edges.fraction)) / edges.fraction) * 100}%)`,
            }}
          />
        </div>
      </div>
      <div
        id="topic-panel"
        role="tabpanel"
        aria-labelledby={`tab-${current.id}`}
        tabIndex={0}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${topic}-${language}`}
            className="suggestion-grid"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: reduced ? 0 : 0.05 } },
              exit: {
                opacity: 0,
                y: reduced ? 0 : -5,
                transition: { duration: reduced ? 0 : 0.15 },
              },
            }}
          >
            {current.questions?.[language].map((question, index) => (
              <motion.div
                key={question}
                variants={{
                  hidden: {
                    opacity: 0,
                    y: reduced ? 0 : 16,
                    filter: reduced ? "none" : "blur(8px)",
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: reduced ? 0 : 0.35 },
                  },
                }}
              >
                <button
                  className="suggestion-card"
                  onClick={() => send(question)}
                >
                  <span className={`icon-tile tile-${index}`}>
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  <span className="suggestion-text">{question}</span>
                  <ArrowUpRight className="suggestion-arrow" size={19} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
