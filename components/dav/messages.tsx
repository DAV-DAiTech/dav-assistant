"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Copy,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { text, type Language } from "@/lib/frontend/i18n";
import type { ChatMessage } from "@/lib/frontend/adapters";
import { Logo, Reveal } from "./primitives";
export function Messages({
  messages,
  language,
  streaming,
  regenerate,
  rate,
  notice,
}: {
  messages: ChatMessage[];
  language: Language;
  streaming: boolean;
  regenerate: () => void;
  rate: (id: string, rating: "up" | "down") => void;
  notice: (s: string) => void;
}) {
  const t = text[language];
  const list = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (!away && list.current)
      list.current.scrollTop = list.current.scrollHeight;
  }, [messages, away]);
  return (
    <div className="message-container">
      <div
        className="message-list"
        data-lenis-prevent
        ref={list}
        role="log"
        aria-label={t.chat}
        aria-live={streaming ? "off" : "polite"}
        onScroll={() => {
          if (list.current)
            setAway(
              list.current.scrollHeight -
                list.current.scrollTop -
                list.current.clientHeight >
                100,
            );
        }}
      >
        {messages.map((m, i) => (
          <Reveal key={m.id} className={`message-row ${m.role}`}>
            <div className="message-avatar">
              {m.role === "assistant" ? <Logo /> : <span>{t.you}</span>}
            </div>
            <div className="message-body">
              <span className="message-author">
                {m.role === "assistant" ? "DAV Assistant" : t.you}
              </span>
              <div className="message-bubble">
                {m.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ children }) => <div className="table-scroll" tabIndex={0} role="region" aria-label={t.table}><table>{children}</table></div>,
                      a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          {children}<ArrowUpRight size={14} aria-hidden="true" />
                        </a>
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  <span className="typing-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </div>
              {m.role === "assistant" &&
                m.content &&
                !(streaming && i === messages.length - 1) && (
                  <>
                    {m.sources?.some((source) => /^https?:\/\//i.test(source.url)) && (
                      <div className="source-chips">
                        <span>{t.sources}</span>
                        {m.sources.filter((source) => /^https?:\/\//i.test(source.url)).map((source, index) => (
                          <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer">
                            {source.title || source.url}
                            <ArrowUpRight size={14} aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="message-actions">
                      <button
                        className="icon-button"
                        aria-label={t.copy}
                        title={t.copy}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(m.content);
                            setCopied(m.id);
                            notice(t.copied);
                          } catch {
                            notice(t.copyError);
                          }
                        }}
                      >
                        {copied === m.id ? (
                          <Check size={15} />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>
                      <button
                        className="icon-button"
                        title={t.like}
                        aria-label={t.like}
                        aria-pressed={m.rating === "up"}
                        onClick={() => rate(m.id, "up")}
                      >
                        <ThumbsUp size={15} />
                      </button>
                      <button
                        className="icon-button"
                        title={t.dislike}
                        aria-label={t.dislike}
                        aria-pressed={m.rating === "down"}
                        onClick={() => rate(m.id, "down")}
                      >
                        <ThumbsDown size={15} />
                      </button>
                      {i === messages.length - 1 && (
                        <button
                          className="icon-button"
                          aria-label={t.regenerate}
                          title={t.regenerate}
                          onClick={regenerate}
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </>
                )}
            </div>
          </Reveal>
        ))}
      </div>
      {streaming && (
        <span className="sr-only" role="status">
          {t.thinking}
        </span>
      )}
      {away && (
        <button
          className="latest-button"
          onClick={() => {
            setAway(false);
            if (list.current)
              list.current.scrollTop = list.current.scrollHeight;
          }}
        >
          <ArrowDown size={15} />
          {t.latest}
        </button>
      )}
    </div>
  );
}
