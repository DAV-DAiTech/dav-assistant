"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ArrowUpRight, FileText, Mic, Plus, Square, X } from "lucide-react";
import { text, type Language } from "@/lib/frontend/i18n";
import { RgbBorderComposer } from "./rgb-border-composer";
import { ContactPopover } from "./contact-popover";
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

  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [activity, setActivity] = useState(0);
  const [pulse, setPulse] = useState(0);
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
    setPulse((n) => n + 1);
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
      <div
        className="composer-shell"
        data-focused={focused}
        data-has-text={Boolean(input)}
        onClick={(event) => {
          if (!(event.target as HTMLElement).closest("button, input, textarea, a"))
            textarea.current?.focus();
        }}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            setFocused(false);
        }}
      >
        <RgbBorderComposer focused={focused} activity={activity} pulse={pulse} />
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
            title={`${t.attach} (${t.soon})`}
            aria-label={`${t.attach} (${t.soon})`}
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
            onChange={(e) => {
              setInput(e.target.value);
              setActivity((n) => n + 1);
            }}
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
            title={`${t.mic} (${t.soon})`}
            aria-label={`${t.mic} (${t.soon})`}
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
        </div>
      </div>
      <div className="disclaimer">
        <span>
          {t.disclaimer}{" "}
          <a href="https://dav.edu.vn" target="_blank" rel="noopener noreferrer">
            dav.edu.vn<ArrowUpRight size={13} aria-hidden="true" />
          </a>.
        </span>
        <ContactPopover language={language} />
      </div>
    </motion.div>
  );
}
