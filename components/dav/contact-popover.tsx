"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Info, Mail, Phone, X } from "lucide-react";
import { text, type Language } from "@/lib/frontend/i18n";
import { getContactPosition } from "@/lib/frontend/contact-position";

function FacebookGlyph() {
  // Facebook asset sourced from theSVG.org; paths retain the original proportions.
  return <svg viewBox="0 0 666.667 666.667" width="22" height="22" aria-hidden="true">
    <g transform="matrix(1.33333 0 0 -1.33333 -133.333 800)">
      <path fill="#1877F2" transform="translate(600 350)" d="M0 0c0 138.071-111.929 250-250 250S-500 138.071-500 0c0-117.245 80.715-215.622 189.606-242.638v166.242h-51.552V0h51.552v32.919c0 85.092 38.508 124.532 122.048 124.532 15.838 0 43.167-3.105 54.347-6.211V81.986c-5.901.621-16.149.932-28.882.932-40.993 0-56.832-15.528-56.832-55.9V0h81.659l-14.028-76.396h-67.631v-171.773C-95.927-233.218 0-127.818 0 0" />
      <path fill="#fff" transform="translate(447.918 273.604)" d="m0 0 14.029 76.396H-67.63v27.019c0 40.372 15.838 55.899 56.831 55.899 12.733 0 22.981-.31 28.882-.931v69.253c-11.18 3.106-38.509 6.212-54.347 6.212-83.539 0-122.048-39.441-122.048-124.533V76.396h-51.552V0h51.552v-166.242a250.559 250.559 0 0 1 60.394-7.362c10.254 0 20.358.632 30.288 1.831V0Z" />
    </g>
  </svg>;
}

function ContactRow({ icon, title, value, href, external, label, index }: {
  icon: ReactNode; title: string; value: string; href?: string;
  external?: boolean; label?: string; index: number;
}) {
  const content = <>
    <span className="contact-tile" aria-hidden="true">{icon}</span>
    <span className="contact-row-copy"><strong>{title}</strong><span title={value}>{value}</span></span>
    {href && <ArrowUpRight className="contact-row-arrow" size={16} aria-hidden="true" />}
  </>;
  const style = { "--row-delay": `${index * 40}ms` } as CSSProperties;
  return href ? <a className="contact-row" href={href} style={style} aria-label={label}
    target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{content}</a>
    : <div className="contact-row" style={style}>{content}</div>;
}

export function ContactPopover({ language }: { language: Language }) {
  const t = text[language];
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<ReturnType<typeof getContactPosition> | null>(null);
  const reduced = useReducedMotion();
  const cancelHover = useCallback(() => clearTimeout(hoverTimer.current), []);
  const close = useCallback(() => {
    cancelHover();
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }, [cancelHover]);
  const show = () => {
    cancelHover();
    setPosition(null);
    setOpen(true);
  };

  useEffect(() => cancelHover, [cancelHover]);

  useLayoutEffect(() => {
    if (!open) return;
    const button = trigger.current;
    const dialog = panel.current;
    if (!button || !dialog) return;
    let frame = 0;
    const place = () => {
      frame = 0;
      const box = button.getBoundingClientRect();
      setPosition(getContactPosition(box, dialog.offsetWidth, dialog.scrollHeight, window.innerWidth, window.innerHeight));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(button);
    observer.observe(dialog);
    place();
    dialog.focus({ preventScroll: true });
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
    };
  }, [open, language]);

  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) => target instanceof Node &&
      (panel.current?.contains(target) || trigger.current?.contains(target));
    const outside = (event: PointerEvent) => { if (!inside(event.target)) close(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    // Non-modal: Tab may leave the panel without trapping keyboard users.
    const focus = (event: FocusEvent) => { if (!inside(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("focusin", focus);
    };
  }, [open, close]);

  return <>
    <button ref={trigger} type="button" className="contact-trigger" aria-haspopup="dialog"
      aria-expanded={open} aria-controls={id}
      onClick={() => open ? close() : show()}
      onPointerEnter={(event) => {
        if (!open && event.pointerType === "mouse" && matchMedia("(hover: hover) and (pointer: fine)").matches)
          hoverTimer.current = setTimeout(show, 200);
      }}
      onPointerLeave={cancelHover} onPointerDown={cancelHover}>
      <Info className="contact-info-icon" size={16} aria-hidden="true" />
      <span>{t.details}</span><ChevronDown className="contact-chevron" size={13} aria-hidden="true" />
    </button>
    {typeof document !== "undefined" && createPortal(<AnimatePresence>
      {open && <motion.div key="contact" ref={panel} id={id} role="dialog" aria-label={t.details}
        tabIndex={-1} className="contact-popover" data-side={position?.side ?? "top"}
        data-lenis-prevent
        style={{ left: position?.left ?? 0, top: position?.top ?? 0,
          visibility: position ? "visible" : "hidden", "--contact-arrow": `${position?.arrow ?? 180}px`,
        } as CSSProperties}
        initial={{ opacity: 0, scale: reduced ? 1 : .96, y: reduced ? 0 : 8, filter: reduced ? "none" : "blur(6px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: reduced ? "none" : "blur(0px)" }}
        exit={{ opacity: 0, scale: reduced ? 1 : .96, y: reduced ? 0 : 4, transition: { duration: reduced ? 0 : .16 } }}
        transition={{ duration: reduced ? 0 : .24, ease: [.22, 1, .36, 1] }}>
        <div className="contact-popover-content">
          <div className="contact-heading"><h2>{t.contactClub}</h2>
            <button className="contact-close" type="button" onClick={close} aria-label={t.close}><X size={16} /></button>
          </div>
          <ContactRow index={0} icon={<FacebookGlyph />} title="Facebook" value={t.contactClubShort}
            href="https://www.facebook.com/profile.php?id=61591989592893" external label={t.openClubFacebook} />
          <ContactRow index={1} icon={<Mail size={20} />} title="Email" value="daitechclub1@gmail.com" href="mailto:daitechclub1@gmail.com" />
          <div className="contact-row contact-hotline" style={{ "--row-delay": "80ms" } as CSSProperties}>
            <span className="contact-tile" aria-hidden="true"><Phone size={20} /></span>
            <span className="contact-row-copy">
              <strong>{t.admissionsHotline}</strong>
              <span className="hotline-numbers">
                <a href="tel:0943482840">0943.482.840</a>
                <span className="hotline-divider" aria-hidden="true">·</span>
                <a href="tel:0936018433">0936.018.433</a>
              </span>
            </span>
          </div>
        </div>
      </motion.div>}
    </AnimatePresence>, document.body)}
  </>;
}
