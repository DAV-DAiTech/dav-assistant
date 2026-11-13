"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, FileText, Info, Mic, Plus, Square, X } from "lucide-react";
import { text, type Language } from "@/lib/frontend/i18n";
export function Composer({
  language,
  streaming,
  send,
  stop,
  notice,
  docked = false,
}: {
  docked?: boolean;
  language: Language;
  streaming: boolean;
  send: (input: string) => void;
  stop: () => void;
  notice: (message: string) => void;
}) {
  const t = text[language];
  const reduced = useReducedMotion();
  const area = useRef<HTMLDivElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => {
    const node = area.current;
    if (!node || !docked) return;
    let frame = 0;
    let previous = 0;
    const observer = new ResizeObserver(([entry]) => {
      const height = Math.ceil(
        entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height,
      );
      if (height === previous) return;
      previous = height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        document.documentElement.style.setProperty(
          "--dock-height",
          `${height}px`,
        ),
      );
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--dock-height");
    };
  }, [docked]);
  useEffect(() => {
    if (!detailsOpen) return;
    const close = (event: globalThis.PointerEvent) => {
      if (!(event.target as HTMLElement).closest(".details-tooltip"))
        setDetailsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [detailsOpen]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [micActive, setMicActive] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const micTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !target.isContentEditable &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        textarea.current?.focus();
      }
    };
    window.addEventListener("keydown", focus);
    return () => {
      window.removeEventListener("keydown", focus);
      if (micTimer.current) clearTimeout(micTimer.current);
    };
  }, []);
  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = "auto";
      textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 150)}px`;
    }
  }, [input]);
  function submit() {
    if (!input.trim() || streaming) return;
    send(input.trim());
    setInput("");
    setFiles([]);
  }
  return (
    <motion.div
      ref={area}
      layout
      layoutId="main-composer"
      data-docked={docked}
      className={`composer-area ${docked ? "is-docked" : "in-hero"}`}
      transition={{
        layout: { duration: reduced ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <div className="composer-shell">
        <span className="composer-border" aria-hidden="true" />
        {files.length > 0 && (
          <div className="attached-files">
            {files.map((name, i) => (
              <span key={`${name}-${i}`}>
                <FileText size={14} />
                {name}
                <button
                  aria-label={`${t.remove}: ${name}`}
                  onClick={() =>
                    setFiles((old) => old.filter((_, n) => i !== n))
                  }
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            ref={fileInput}
            className="sr-only"
            aria-label={t.attach}
            type="file"
            tabIndex={-1}
            multiple
            onChange={(e) => {
              setFiles(
                Array.from(e.target.files || [])
                  .slice(0, 4)
                  .map((file) => file.name),
              );
              notice(t.attachmentNote);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="icon-button attach-button"
            title={t.attach}
            aria-label={t.attach}
            onClick={() => fileInput.current?.click()}
          >
            <Plus size={22} />
          </button>
          <textarea
            ref={textarea}
            id="composer-input"
            data-lenis-prevent
            aria-describedby="composer-hints"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label={t.placeholder}
            placeholder={t.placeholder}
            rows={1}
            maxLength={8000}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <kbd className="composer-shortcut">/</kbd>
          <button
            type="button"
            className={`icon-button mic-button ${micActive ? "mic-active" : ""}`}
            title={t.mic}
            aria-label={t.mic}
            onClick={() => {
              setMicActive(true);
              notice(t.micNote);
              if (micTimer.current) clearTimeout(micTimer.current);
              micTimer.current = setTimeout(() => setMicActive(false), 1500);
            }}
          >
            <Mic size={20} />
          </button>
          {streaming ? (
            <button
              type="button"
              className="send-button is-streaming"
              onClick={stop}
              aria-label={t.stop}
              title={t.stop}
            >
              <Square size={17} fill="currentColor" />
            </button>
          ) : (
            <button
              className="send-button"
              disabled={!input.trim()}
              aria-label={t.send}
              title={t.send}
              type="submit"
            >
              <ArrowUp size={23} />
            </button>
          )}
        </form>
        <div className="composer-hints" id="composer-hints">
          <span>
            {t.enter}
            <span className="hint-divider">·</span>
            {t.shiftEnter}
          </span>
          <span className="demo-label">
            <span />
            {t.demo}
          </span>
        </div>
      </div>
      <div className="disclaimer">
        <span>
          {t.disclaimer}{" "}
          <a href="https://dav.edu.vn" target="_blank" rel="noreferrer">
            dav.edu.vn
          </a>
        </span>
        <div className="details-tooltip">
          <button
            type="button"
            className="details-trigger"
            aria-expanded={detailsOpen}
            aria-controls="composer-details"
            onClick={() => setDetailsOpen(!detailsOpen)}
          >
            <Info size={13} />
            {t.details}
          </button>
          <AnimatePresence>
            {detailsOpen && (
              <motion.div
                id="composer-details"
                role="note"
                initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : 4 }}
                transition={{ duration: reduced ? 0 : 0.25 }}
              >
                <strong>{t.hotline}</strong>
                <a href="tel:0943482840">0943.482.840</a>
                <a href="tel:0936018433">0936.018.433</a>
                <p>{t.privacy}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
