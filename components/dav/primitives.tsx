"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";

export function Logo({ hero = false }: { hero?: boolean }) {
  return (
    <span className={hero ? "dav-logo hero-logo" : "dav-logo"}>
      <Image
        src="/assets/img/dav-logo.png"
        alt="DAV"
        width={hero ? 68 : 40}
        height={hero ? 68 : 40}
        priority
      />
    </span>
  );
}
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -20px 0px" }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
export function Modal({
  children,
  title,
  closeLabel,
  onClose,
  className = "",
}: {
  children: ReactNode;
  title: string;
  closeLabel: string;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  function requestClose() {
    if (closeTimer.current) return;
    if (reduced) {
      onCloseRef.current();
      return;
    }
    setClosing(true);
    closeTimer.current = setTimeout(() => onCloseRef.current(), 180);
  }
  useEffect(() => {
    const dialog = ref.current;
    const focused = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      dialog?.close();
      document.body.style.overflow = overflow;
      focused?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`glass-modal ${className} ${closing ? "is-closing" : ""}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            requestClose();
        }
      }}
    >
      <div className="modal-top">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label={closeLabel}
          onClick={requestClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function AmbientBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        ref.current?.style.setProperty(
          "--pointer-x",
          `${(e.clientX / innerWidth - 0.5) * 18}px`,
        );
        ref.current?.style.setProperty(
          "--pointer-y",
          `${(e.clientY / innerHeight - 0.5) * 18}px`,
        );
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, [reduced]);
  useEffect(() => {
    if (reduced) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    void import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      const lenis = new Lenis({
        autoRaf: true,
        duration: 1.05,
        prevent: (node) =>
          node.hasAttribute("data-lenis-prevent") || node.tagName === "DIALOG",
      });
      cleanup = () => lenis.destroy();
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [reduced]);
  return (
    <div className="ambient" aria-hidden="true" ref={ref}>
      <div className="aurora aurora-blue" />
      <div className="aurora aurora-red" />
      <div className="ambient-globe">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="orb orb-one" />
      <span className="orb orb-two" />
      <span className="orb orb-three" />
      <div className="grain" />
    </div>
  );
}
