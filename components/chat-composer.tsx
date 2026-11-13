"use client";

import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { useRef, useState } from "react";

interface ChatComposerProps {
  disabled?: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function ChatComposer({ disabled, streaming, onSend, onStop }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function submit() {
    const value = text.trim();
    if (!value || disabled || streaming) return;
    onSend(value);
    setText("");
    setFiles([]);
  }

  return (
    <div className="composer-wrap">
      <div className="composer-shell">
        {files.length > 0 && (
          <div className="file-pills">
            {files.map((file, index) => (
              <span key={`${file.name}-${file.size}`}><Paperclip size={12} /> {file.name}<button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}><X size={12} /></button></span>
            ))}
          </div>
        )}
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              event.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Ask about DAV programs, admissions, and student life…"
          aria-label="Message DAV Assistant"
          disabled={disabled}
        />
        <div className="composer-controls">
          <button className="attach-button" type="button" onClick={() => fileRef.current?.click()} aria-label="Attach files"><Paperclip size={18} /></button>
          <input ref={fileRef} type="file" multiple hidden onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 3))} />
          {streaming ? (
            <button className="send-button" type="button" onClick={onStop} aria-label="Stop response"><Square size={14} fill="currentColor" /></button>
          ) : (
            <button className="send-button" type="button" onClick={submit} disabled={!text.trim() || disabled} aria-label="Send message"><ArrowUp size={18} /></button>
          )}
        </div>
      </div>
      <p className="composer-hint">Press Enter to send · Shift + Enter for a new line</p>
    </div>
  );
}
