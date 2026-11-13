"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Sparkles, Globe2 } from "lucide-react";
import { useEffect, useState } from "react";
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
export function Welcome({ language }: { language: Language }) {
  const t = text[language];
  const [headline, setHeadline] = useState<number | null>(null);
  useEffect(() => {
    pageHeadlineIndex ??= Math.floor(Math.random() * 3);
    setHeadline(pageHeadlineIndex);
  }, []);
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
