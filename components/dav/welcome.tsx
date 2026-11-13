"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Sparkles, Globe2 } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import {
  featureDescriptions,
  headlines,
  headlineAccents,
  text,
  type Language,
} from "@/lib/frontend/i18n";
import { suggestions } from "@/lib/frontend/suggestions";
import { Logo, Reveal } from "./primitives";
// Reopening the welcome screen preserves the page-load choice, including across language changes.
let pageHeadlineIndex: number | null = null;
export function Welcome({
  language,
  topic,
  setTopic,
  send,
}: {
  language: Language;
  topic: number;
  setTopic: (n: number) => void;
  send: (s: string) => void;
}) {
  const t = text[language];
  const [headline, setHeadline] = useState<number | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    pageHeadlineIndex ??= Math.floor(Math.random() * 3);
    setHeadline(pageHeadlineIndex);
  }, []);
  const current = suggestions[topic];
  const Icon = current.icon;
  function spotlight(e: MouseEvent<HTMLButtonElement>) {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
    e.currentTarget.style.transform = `perspective(900px) rotateX(${(-(e.clientY - r.top - r.height / 2) / r.height) * 4}deg) rotateY(${((e.clientX - r.left - r.width / 2) / r.width) * 4}deg) translateY(-3px)`;
  }
  return (
    <>
      <section className="welcome-hero">
        <Reveal className="hero-mark">
          <Logo hero />
          <span className="hero-sparkle">
            <Sparkles size={17} />
          </span>
        </Reveal>
        <Reveal delay={0.06}>
          <p className="eyebrow hero-eyebrow">{t.heroEyebrow}</p>
        </Reveal>
        <div className="headline-slot">
          <AnimatePresence mode="wait">
            {headline !== null && (
              <motion.h1
                key={language}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <span className="headline-intro">
                  {headlines[language][headline]
                    .slice(0, -headlineAccents[language][headline].length)
                    .trim()}
                </span>{" "}
                <span className="gradient-text headline-accent">
                  {headlineAccents[language][headline]}
                </span>
              </motion.h1>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={language}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="hero-copy"
          >
            <p>{t.heroCopy}</p>
            <p>{t.heroCopy2}</p>
          </motion.div>
        </AnimatePresence>
      </section>
      <section id="topics" className="topics-section">
        <div className="section-kicker">
          <span>
            <Sparkles className="tiny-spark" size={12} />
            {t.popular}
          </span>
          <span className="suggestion-hint">{t.suggestionHint}</span>
        </div>
        <div
          className="topic-tabs"
          role="tablist"
          aria-label={t.topics}
          data-lenis-prevent
        >
          {suggestions.map((item, i) => (
            <button
              type="button"
              key={item.id}
              role="tab"
              id={`tab-${item.id}`}
              aria-controls="topic-panel"
              aria-selected={topic === i}
              tabIndex={topic === i ? 0 : -1}
              onKeyDown={(e) => {
                if (
                  ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? suggestions.length - 1
                        : (i +
                            (e.key === "ArrowRight" ? 1 : -1) +
                            suggestions.length) %
                          suggestions.length;
                  setTopic(next);
                  document
                    .getElementById(`tab-${suggestions[next].id}`)
                    ?.focus();
                }
              }}
              onClick={(e) => {
                setTopic(i);
                e.currentTarget.scrollIntoView({
                  block: "nearest",
                  inline: "center",
                  behavior: reduced ? "instant" : "smooth",
                });
              }}
            >
              {topic === i && (
                <motion.span
                  className="topic-indicator"
                  layoutId="topic-indicator"
                />
              )}
              <item.icon size={16} />
              <span>{item.label[language]}</span>
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            id="topic-panel"
            role="tabpanel"
            aria-labelledby={`tab-${current.id}`}
            key={`${topic}-${language}`}
            className="suggestion-grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {current.questions[language].map((question, i) => (
              <button
                className="suggestion-card"
                key={question}
                onClick={() => send(question)}
                onMouseMove={spotlight}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                }}
              >
                <span className={`icon-tile tile-${i}`}>
                  <Icon size={22} />
                </span>
                <span className="suggestion-text">{question}</span>
                <ArrowUpRight className="suggestion-arrow" size={19} />
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </section>
    </>
  );
}
export function Discovery({
  language,
  openEcosystem,
  onTopic,
}: {
  language: Language;
  openEcosystem: () => void;
  onTopic: (n: number) => void;
}) {
  const t = text[language];
  const indices = [0, 3, 2, 6, 8, 5];
  const descriptions = featureDescriptions[language];
  return (
    <div className="discovery">
      <Reveal className="discovery-heading">
        <p className="eyebrow">{t.featuresEyebrow}</p>
        <h2>{t.featuresTitle}</h2>
        <p>{t.featuresCopy}</p>
      </Reveal>
      <div className="feature-grid">
        {indices.map((index, i) => {
          const item = suggestions[index];
          return (
            <Reveal key={item.id} delay={i * 0.06}>
              <button className="feature-card" onClick={() => onTopic(index)}>
                <span className="feature-number">0{i + 1}</span>
                <span className="icon-tile">
                  <item.icon size={23} />
                </span>
                <h3>{item.label[language]}</h3>
                <p>{descriptions[i]}</p>
                <ArrowUpRight size={18} className="feature-arrow" />
              </button>
            </Reveal>
          );
        })}
      </div>
      <Reveal className="ecosystem-teaser">
        <div className="teaser-icon">
          <Globe2 size={40} strokeWidth={1} />
        </div>
        <div>
          <h2>{t.ecosystemTeaser}</h2>
          <p>{t.ecosystemTeaserCopy}</p>
        </div>
        <button className="primary-button" onClick={openEcosystem}>
          {t.explore}
          <ArrowRight size={17} />
        </button>
      </Reveal>
      <footer className="site-footer">
        <span>{t.footer}</span>
        <span>{t.updated}</span>
      </footer>
    </div>
  );
}
