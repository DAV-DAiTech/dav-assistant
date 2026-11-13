"use client";

import { Bot, Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MessageDto } from "@/lib/types";

function RichText({ text }: { text: string }) {
  return (
    <div className="message-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<"up" | "down" | null>(null);

  async function copy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="message-actions" aria-label="Message actions">
      <button type="button" onClick={copy} aria-label="Copy response">{copied ? <Check size={14} /> : <Copy size={14} />}</button>
      <button type="button" className={rating === "up" ? "is-selected" : ""} onClick={() => setRating(rating === "up" ? null : "up")} aria-label="Helpful"><ThumbsUp size={14} /></button>
      <button type="button" className={rating === "down" ? "is-selected" : ""} onClick={() => setRating(rating === "down" ? null : "down")} aria-label="Not helpful"><ThumbsDown size={14} /></button>
    </div>
  );
}

export function MessageList({ messages, streaming }: { messages: MessageDto[]; streaming: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth", block: "end" });
  }, [messages, streaming]);

  return (
    <div className="message-scroll" aria-live="polite">
      <div className="message-column">
        {messages.map((message) => (
          <article className={`message-row message-${message.role}`} key={message.id}>
            {message.role === "assistant" && <span className="bot-tile" aria-hidden="true"><Bot size={17} /></span>}
            <div className="message-body">
              <div className="message-bubble"><RichText text={message.content} /></div>
              <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              {message.role === "assistant" && message.content && <MessageActions content={message.content} />}
            </div>
          </article>
        ))}
        {streaming && !messages.some((message) => message.id === "streaming") && (
          <div className="message-row message-assistant">
            <span className="bot-tile" aria-hidden="true"><Bot size={17} /></span>
            <div className="typing-indicator" aria-label="DAV Assistant is thinking"><i /><i /><i /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
