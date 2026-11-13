"use client";
import { useState } from "react";
import {
  HardDrive,
  MessageSquare,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { text, type Language } from "@/lib/frontend/i18n";
import type { LocalConversation } from "@/lib/frontend/adapters";
import { Modal } from "./primitives";
export function HistoryPanel({
  language,
  conversations,
  selected,
  loading,
  onClose,
  onNew,
  onSelect,
  onRename,
  onPin,
  onDelete,
  onDeleteAll,
}: {
  language: Language;
  conversations: LocalConversation[];
  selected: string | null;
  loading: boolean;
  onClose: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}) {
  const t = text[language];
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const groups = ["pinned", "today", "yesterday", "week", "older"] as const;
  const filtered = conversations.filter((c) =>
    c.title
      .toLocaleLowerCase(language)
      .includes(search.toLocaleLowerCase(language)),
  );
  function group(c: LocalConversation) {
    if (c.pinned) return "pinned";
    const days = (today.getTime() - c.updatedAt) / 86400000;
    return days <= 0
      ? "today"
      : days <= 1
        ? "yesterday"
        : days <= 7
          ? "week"
          : "older";
  }
  return (
    <Modal
      title={t.history}
      closeLabel={t.close}
      onClose={onClose}
      className="history-modal"
    >
      <button className="primary-button new-chat" onClick={onNew}>
        <Plus size={18} />
        {t.newChat}
      </button>
      <label className="history-search">
        <Search size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
        />
      </label>
      <div className="history-items" data-lenis-prevent>
        {loading ? (
          <div className="history-skeleton" aria-label={t.loading}>
            <span />
            <span />
            <span />
          </div>
        ) : filtered.length === 0 ? (
          <div className="history-empty">
            <MessageSquare size={30} />
            <h3>{search ? t.clearSearch : t.empty}</h3>
            {!search && <p>{t.emptyCopy}</p>}
          </div>
        ) : (
          groups.map((key) => {
            const items = filtered
              .filter((c) => group(c) === key)
              .sort((a, b) => b.updatedAt - a.updatedAt);
            return (
              items.length > 0 && (
                <section key={key}>
                  <h3 className="history-group">{t[key]}</h3>
                  {items.map((c) => (
                    <div
                      className={`history-item ${c.id === selected ? "selected" : ""}`}
                      key={c.id}
                    >
                      {editing === c.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (value.trim()) {
                              onRename(c.id, value.trim());
                              setEditing(null);
                            }
                          }}
                        >
                          <label className="sr-only" htmlFor="rename-title">
                            {t.title}
                          </label>
                          <input
                            id="rename-title"
                            autoFocus
                            value={value}
                            maxLength={100}
                            onChange={(e) => setValue(e.target.value)}
                            required
                          />
                          <div>
                            <button type="submit">{t.save}</button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                            >
                              {t.cancel}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <button
                            className="history-select"
                            onClick={() => onSelect(c.id)}
                          >
                            <MessageSquare size={15} />
                            <span>{c.title}</span>
                            {c.pinned && <Pin size={12} />}
                          </button>
                          <div className="history-actions">
                            <button
                              className="icon-button"
                              title={t.rename}
                              aria-label={`${t.rename}: ${c.title}`}
                              onClick={() => {
                                setEditing(c.id);
                                setValue(c.title);
                              }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="icon-button"
                              title={c.pinned ? t.unpin : t.pin}
                              aria-label={`${c.pinned ? t.unpin : t.pin}: ${c.title}`}
                              onClick={() => onPin(c.id)}
                            >
                              <Pin size={14} />
                            </button>
                            <button
                              className="icon-button danger"
                              title={t.delete}
                              aria-label={`${t.delete}: ${c.title}`}
                              onClick={() => onDelete(c.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </section>
              )
            );
          })
        )}
      </div>
      <div className="history-footer">
        <span>
          <HardDrive size={13} />
          {t.local}
        </span>
        {conversations.length > 0 && (
          <button
            className="text-button danger"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={14} />
            {t.deleteAll}
          </button>
        )}
      </div>
      {confirm && (
        <div className="delete-confirm" role="alert">
          <h3>{t.confirmDelete}</h3>
          <p>{t.confirmCopy}</p>
          <div>
            <button className="text-button" onClick={() => setConfirm(false)}>
              {t.cancel}
            </button>
            <button
              className="danger-button"
              onClick={() => {
                onDeleteAll();
                setConfirm(false);
              }}
            >
              {t.deleteAll}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
