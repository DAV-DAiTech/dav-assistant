"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationDto } from "@/lib/types";

interface ConfirmationModalProps {
  mode: "rename" | "delete";
  conversation: ConversationDto;
  onCancel: () => void;
  onConfirm: (value?: string) => Promise<void>;
}

export function ConfirmationModal({ mode, conversation, onCancel, onConfirm }: ConfirmationModalProps) {
  const [title, setTitle] = useState(conversation.title);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function confirm() {
    if (mode === "rename" && !title.trim()) return;
    setBusy(true);
    await onConfirm(mode === "rename" ? title.trim() : undefined);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">{mode === "rename" ? "Rename conversation" : "Delete conversation?"}</h2>
        {mode === "rename" ? (
          <label>Conversation title<input ref={inputRef} value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} /></label>
        ) : (
          <p>This will permanently delete “{conversation.title}” and its messages.</p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={mode === "delete" ? "danger-button" : "primary-button"} onClick={confirm} disabled={busy}>{busy ? "Working…" : mode === "rename" ? "Save" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}
