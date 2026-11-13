"use client";

import { MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConversationDto } from "@/lib/types";

interface HistorySidebarProps {
  conversations: ConversationDto[];
  activeId: string | null;
  mobileOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (conversation: ConversationDto) => void;
  onDelete: (conversation: ConversationDto) => void;
}

function sectionFor(date: string) {
  const value = new Date(date);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startValue = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const days = Math.round((startToday.valueOf() - startValue.valueOf()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  if (days < 30) return "Previous 30 days";
  return value.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function HistorySidebar(props: HistorySidebarProps) {
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const groups = useMemo(() => {
    const filtered = props.conversations.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
    return filtered.reduce<Record<string, ConversationDto[]>>((result, conversation) => {
      const section = sectionFor(conversation.updatedAt);
      (result[section] ||= []).push(conversation);
      return result;
    }, {});
  }, [props.conversations, query]);

  return (
    <>
      {props.mobileOpen && <button className="sheet-backdrop" aria-label="Close chat history" onClick={props.onClose} />}
      <aside className={`history-sidebar ${props.mobileOpen ? "is-open" : ""}`} aria-label="Chat history">
        <div className="history-mobile-title">
          <strong>Chat history</strong>
          <button className="icon-button" type="button" onClick={props.onClose} aria-label="Close chat history"><X size={18} /></button>
        </div>
        <button className="new-chat-button" type="button" onClick={props.onNew}>
          <Plus size={17} /> New chat
        </button>
        <label className="history-search">
          <Search size={16} />
          <span className="sr-only">Search chat history</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" />
        </label>
        <div className="history-list">
          {props.loading ? <p className="history-empty">Loading history…</p> : null}
          {!props.loading && !Object.keys(groups).length ? <p className="history-empty">No conversations yet</p> : null}
          {Object.entries(groups).map(([section, conversations]) => (
            <section key={section} className="history-group">
              <h2>{section}</h2>
              {conversations.map((conversation) => (
                <div className={`history-row ${props.activeId === conversation.id ? "is-active" : ""}`} key={conversation.id}>
                  <button className="history-title" type="button" onClick={() => props.onSelect(conversation.id)}>
                    {conversation.title}
                  </button>
                  <button className="history-menu-trigger" type="button" onClick={() => setMenuId(menuId === conversation.id ? null : conversation.id)} aria-label={`Actions for ${conversation.title}`} aria-expanded={menuId === conversation.id}>
                    <MoreHorizontal size={17} />
                  </button>
                  {menuId === conversation.id && (
                    <div className="history-menu">
                      <button type="button" onClick={() => { setMenuId(null); props.onRename(conversation); }}><Pencil size={14} /> Rename</button>
                      <button type="button" className="danger" onClick={() => { setMenuId(null); props.onDelete(conversation); }}><Trash2 size={14} /> Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}
