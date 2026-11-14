"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ecosystem } from "@/lib/frontend/ecosystem";
import { text, type Language } from "@/lib/frontend/i18n";
import { Modal } from "./primitives";

export function EcosystemMenu({ language, onClose }: { language: Language; onClose: () => void }) {
  const t = text[language];
  const reduced = useReducedMotion();
  const [notice, setNotice] = useState(0);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(0), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <Modal title={t.ecosystem} closeLabel={t.close} onClose={onClose} className="ecosystem-modal">
      {(close) => <>
        <p className="eyebrow">DAiTech × DAV</p>
        <h3 className="ecosystem-heading">{t.ecosystemIntro}</h3>
        <p className="muted">{t.ecosystemCopy}</p>
        <div className="ecosystem-grid">
          {ecosystem.map((item, index) => {
            const content = <>
              <div className="ecosystem-card-top">
                <span className="icon-tile"><item.icon size={28} strokeWidth={1.75} /></span>
                <span className={`badge ${item.status}`}>
                  {item.status === "live" && <i aria-hidden="true" />}{t[item.status]}
                </span>
              </div>
              <h4>{item.label[language]}</h4>
              <p>{item.description[language]}</p>
              <ArrowUpRight size={21} className="card-arrow" aria-hidden="true" />
            </>;
            return (
              <motion.div
                key={item.id}
                className="ecosystem-card-reveal"
                initial={reduced ? false : { opacity: 0, y: 20, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: reduced ? 0 : 0.44, delay: reduced ? 0 : 0.1 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              >
                {item.url ? (
                  <a
                    className="ecosystem-card is-live"
                    href={item.url}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    aria-label={item.external ? t.openClubMatch : item.label[language]}
                    onClick={item.external ? undefined : (event) => { event.preventDefault(); close(); }}
                  >{content}</a>
                ) : (
                  <button type="button" className="ecosystem-card is-soon" onClick={() => setNotice((value) => value + 1)} aria-label={`${item.label[language]} — ${t.soon}`}>
                    {content}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
        <AnimatePresence>
          {notice > 0 && <motion.div className="ecosystem-notice" role="status" initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {t.soon}
          </motion.div>}
        </AnimatePresence>
      </>}
    </Modal>
  );
}
