"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronDown,
  Globe2,
  Grid2X2,
  History,
  Maximize,
  Menu,
  MessageSquare,
  Monitor,
  Moon,
  MoreHorizontal,
  QrCode,
  Sun,
} from "lucide-react";
import { text, type Language } from "@/lib/frontend/i18n";
import { Logo, Modal } from "./primitives";
export type Theme = "light" | "dark" | "system";
type Props = {
  language: Language;
  setLanguage: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  onHistory: () => void;
  onChat: () => void;
  onTopics: () => void;
  onEcosystem: () => void;
  ecosystemOpen: boolean;
  active: string;
  notice: (s: string) => void;
};
export function Header(p: Props) {
  const t = text[p.language];
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = header.current;
    if (!node) return;
    let frame = 0;
    let previous = 0;
    const measure = () => {
      frame = 0;
      const clearance = Math.ceil(
        node.offsetHeight + parseFloat(getComputedStyle(node).top) + 24,
      );
      if (clearance !== previous) {
        previous = clearance;
        document.documentElement.style.setProperty(
          "--header-clearance",
          `${clearance}px`,
        );
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(node);
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);
  const [menu, setMenu] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const { scrollYProgress, scrollY } = useScroll();
  const headerScale = useTransform(scrollY, [0, 180], [1, 0.985]);
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => scrollY.on("change", (y) => setScrolled(y > 30)), [scrollY]);
  const nav = [
    { id: "chat", label: t.chat, icon: MessageSquare, action: p.onChat },
    { id: "topics", label: t.topics, icon: Grid2X2, action: p.onTopics },
    { id: "history", label: t.history, icon: History, action: p.onHistory },
  ];
  const controls = (
    <>
      <div className="language-switch" role="group" aria-label={t.language}>
        {(["vi", "en"] as const).map((lang) => (
          <button
            key={lang}
            aria-pressed={p.language === lang}
            onClick={() => p.setLanguage(lang)}
          >
            {p.language === lang && (
              <motion.span
                className="segment-thumb"
                layoutId="language-thumb"
              />
            )}
            <span>{lang.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="theme-switch" role="group" aria-label={t.theme}>
        {(
          [
            { id: "light", icon: Sun, label: t.light },
            { id: "dark", icon: Moon, label: t.dark },
            { id: "system", icon: Monitor, label: t.system },
          ] as const
        ).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className="icon-button"
            title={label}
            aria-label={label}
            aria-pressed={p.theme === id}
            onClick={() => p.setTheme(id)}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </>
  );
  async function openQr() {
    setMenu(false);
    setQr("");
    try {
      const QRCode = (await import("qrcode")).default;
      setQr(
        await QRCode.toDataURL(window.location.href, {
          width: 280,
          margin: 2,
          color: { dark: "#0A2A66", light: "#FFFFFF" },
        }),
      );
    } catch {
      setQr(null);
      p.notice(t.qrError);
    }
  }
  async function fullscreen() {
    setMenu(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      p.notice(t.fullscreenError);
    }
  }
  return (
    <>
      <div className="header-fade" />
      <motion.header
        ref={header}
        className={`glass-header ${scrolled ? "is-scrolled" : ""}`}
        style={{ scale: reduced ? 1 : headerScale }}
      >
        <a
          className="brand"
          href="#main"
          onClick={(e) => {
            e.preventDefault();
            p.onChat();
          }}
        >
          <Logo />
          <span>
            <strong>
              DAV Assistant<span className="brand-dot">.</span>
            </strong>
            <small>{t.subtitle}</small>
          </span>
        </a>
        <nav className="header-nav" aria-label={t.menu}>
          {nav.map(({ id, label, action }) => (
            <button
              key={id}
              onClick={action}
              aria-current={p.active === id ? "page" : undefined}
            >
              {p.active === id && (
                <motion.span
                  layoutId="nav-indicator"
                  className="nav-indicator"
                />
              )}
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="ecosystem-button"
            onClick={p.onEcosystem}
            aria-haspopup="dialog"
            aria-expanded={p.ecosystemOpen}
            aria-label={t.ecosystem}
            title={t.ecosystem}
          >
            <span className="ecosystem-grid-icon" aria-hidden="true"><i /><i /><i /><i /></span>
            <span className="ecosystem-button-label">{t.ecosystem}</span>
            <ChevronDown className="ecosystem-chevron" size={13} />
          </button>
          <div className="desktop-controls">{!menu && controls}</div>
          <button
            className="icon-button more-button"
            onClick={() => setMenu(true)}
            aria-label={t.more}
            aria-haspopup="dialog"
          >
            <MoreHorizontal className="desktop-more" size={21} />
            <Menu className="mobile-more" size={21} />
          </button>
        </div>
        <motion.div
          className="scroll-progress"
          style={{ scaleX: scrollYProgress }}
        />
      </motion.header>
      {menu && (
        <Modal
          title={t.more}
          closeLabel={t.close}
          onClose={() => setMenu(false)}
          className="more-menu"
        >
          <div className="drawer-controls">{controls}</div>
          <nav className="drawer-nav">
            {nav.map(({ id, label, icon: Icon, action }) => (
              <button
                key={id}
                onClick={() => {
                  setMenu(false);
                  action();
                }}
              >
                <Icon size={19} />
                {label}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </nav>
          <div className="menu-links">
            <a href="https://dav.edu.vn" target="_blank" rel="noopener noreferrer">
              <Globe2 size={19} />
              {t.site}
              <ArrowUpRight size={16} />
            </a>
            <button onClick={openQr}>
              <QrCode size={19} />
              {t.qr}
            </button>
            <button onClick={fullscreen}>
              <Maximize size={19} />
              {t.fullscreen}
            </button>
          </div>
        </Modal>
      )}
      {qr !== null && (
        <Modal
          title={t.qr}
          closeLabel={t.close}
          onClose={() => setQr(null)}
          className="qr-modal"
        >
          <p>{t.qrCopy}</p>
          {qr ? (
            <img src={qr} width={280} height={280} alt={t.qr} />
          ) : (
            <p role="status">{t.loading}…</p>
          )}
        </Modal>
      )}
    </>
  );
}
