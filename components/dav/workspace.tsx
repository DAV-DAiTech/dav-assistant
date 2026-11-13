"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, History, RotateCcw, Sparkles, X } from "lucide-react";
import {
  historyStore,
  mockChatAdapter,
  type LocalConversation,
  type ChatMessage,
} from "@/lib/frontend/adapters";
import { text, type Language } from "@/lib/frontend/i18n";
import { AmbientBackground } from "./primitives";
import { Header, EcosystemMenu, type Theme } from "./header";
import { Welcome, Discovery } from "./welcome";
import { Composer } from "./composer";
import { TopicSuggestions } from "./topics";
import { HistoryPanel } from "./history";
import { Messages } from "./messages";

export function DavWorkspace() {
  const reduced = useReducedMotion();
  const [language, setLanguage] = useState<Language>("vi");
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);
  const [topic, setTopic] = useState(0);
  const [activeNav, setActiveNav] = useState("chat");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ecosystemOpen, setEcosystemOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [undo, setUndo] = useState<LocalConversation[] | null>(null);
  const controller = useRef<AbortController | null>(null);
  const current = useRef<LocalConversation[]>([]);
  const t = text[language];
  const { data, isLoading, error, mutate } = useSWR(
    "dav-local-history-v4",
    () => historyStore.load(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );
  useEffect(() => {
    if (data) current.current = data;
  }, [data]);
  useEffect(() => {
    try {
      const preference = localStorage.getItem("dav.theme.v4");
      if (["light", "dark", "system"].includes(preference || ""))
        setTheme(preference as Theme);
      const lang = localStorage.getItem("dav.language.v4");
      if (lang === "en" || lang === "vi") setLanguage(lang);
    } catch {
      /* Browsers can deny local storage; the demo remains usable in memory. */
    }
    setReady(true);
    const connection = () => setOnline(navigator.onLine);
    connection();
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    return () => {
      controller.current?.abort();
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    apply();
    media.addEventListener("change", apply);
    document.documentElement.lang = language;
    try {
      localStorage.setItem("dav.theme.v4", theme);
      localStorage.setItem("dav.language.v4", language);
    } catch {
      /* A storage error must not prevent theme or language changes. */
    }
    return () => media.removeEventListener("change", apply);
  }, [theme, language, ready]);
  useEffect(() => {
    if (error) setToast(t.storageError);
  }, [error, t.storageError]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
      setUndo(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [toast, undo]);

  function commit(next: LocalConversation[], persist = true) {
    current.current = next;
    void mutate(next, { revalidate: false });
    if (persist)
      void historyStore.save(next).catch(() => setToast(t.storageError));
  }
  function stop() {
    if (!controller.current) return;
    controller.current.abort();
    controller.current = null;
    setStreaming(false);
    commit(
      current.current.map((conversation) => ({
        ...conversation,
        messages: conversation.messages.filter(
          (message) =>
            message.role !== "assistant" || message.content.length > 0,
        ),
      })),
    );
  }
  function scrollChat() {
    document.getElementById("main")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  function newChat() {
    stop();
    setSelected(null);
    setHistoryOpen(false);
    setActiveNav("chat");
    scrollChat();
  }
  function openTopics(index?: number) {
    if (index !== undefined) setTopic(index);
    stop();
    setSelected(null);
    setActiveNav("topics");
    setTimeout(
      () =>
        document.getElementById("topics")?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "start",
        }),
      60,
    );
  }
  async function send(input: string, regenerate = false) {
    if (controller.current || isLoading) return;
    setActiveNav("chat");
    const id = selected || crypto.randomUUID();
    let conversation = current.current.find((c) => c.id === id) || {
      id,
      title: input.slice(0, 70),
      pinned: false,
      updatedAt: Date.now(),
      messages: [],
    };
    const lastMessage = conversation.messages.at(-1);
    const previous =
      regenerate && lastMessage?.role === "assistant"
        ? conversation.messages.slice(0, -1)
        : conversation.messages;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      createdAt: Date.now(),
    };
    const reply: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };
    conversation = {
      ...conversation,
      updatedAt: Date.now(),
      messages: [...previous, ...(regenerate ? [] : [userMessage]), reply],
    };
    commit([conversation, ...current.current.filter((c) => c.id !== id)]);
    setSelected(id);
    setStreaming(true);
    const abort = new AbortController();
    controller.current = abort;
    scrollChat();
    try {
      for await (const chunk of mockChatAdapter.stream(
        input,
        language,
        abort.signal,
      )) {
        if (abort.signal.aborted) break;
        commit(
          current.current.map((c) =>
            c.id === id
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === reply.id
                      ? { ...m, content: m.content + chunk }
                      : m,
                  ),
                }
              : c,
          ),
          false,
        );
      }
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        setStreaming(false);
      }
      commit(current.current);
    }
  }
  function editConversation(id: string, changes: Partial<LocalConversation>) {
    commit(
      current.current.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    );
  }
  function remove(id?: string) {
    stop();
    const removed = current.current.filter((c) => !id || c.id === id);
    setUndo(removed);
    commit(id ? current.current.filter((c) => c.id !== id) : []);
    if (!id || selected === id) setSelected(null);
    setToast(t.deleted);
  }
  const active = (data || []).find((c) => c.id === selected);
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="dav-app" data-ready={ready}>
        <a className="skip-link" href="#main">
          {t.skip}
        </a>
        <AmbientBackground />
        <Header
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          setTheme={setTheme}
          active={activeNav}
          onHistory={() => {
            setHistoryOpen(true);
            setActiveNav("history");
          }}
          onChat={() => {
            setActiveNav("chat");
            scrollChat();
          }}
          onTopics={() => openTopics()}
          onEcosystem={() => setEcosystemOpen(true)}
          notice={setToast}
        />
        <main
          id="main"
          className={`main-content ${active ? "is-conversation" : ""}`}
        >
          <div className="workspace-toolbar">
            <div className="connection-chip" title={t.connectionNote}>
              <span className={online ? "status-dot" : "status-dot offline"} />
              {online ? t.online : t.offline}
              <span className="toolbar-divider" />
              <span className="connection-demo">{t.demo}</span>
              {!online && (
                <button
                  className="icon-button"
                  aria-label={t.retry}
                  onClick={() => {
                    setOnline(navigator.onLine);
                    setToast(t.connectionNote);
                  }}
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
            <button
              className="history-shortcut"
              onClick={() => {
                setHistoryOpen(true);
                setActiveNav("history");
              }}
            >
              <History size={15} />
              <span>{t.history}</span>
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="chat-stage">
            <AnimatePresence mode="popLayout" initial={false}>
              {active ? (
                <motion.div
                  key="conversation"
                  className="conversation-view"
                  initial={{ opacity: 0, y: reduced ? 0 : 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduced ? 0 : -24 }}
                  transition={{ duration: reduced ? 0 : 0.4 }}
                >
                  <div className="conversation-heading">
                    <div>
                      <span className="eyebrow">{t.welcomeBack}</span>
                      <h1>{active.title}</h1>
                    </div>
                    <button className="text-button" onClick={newChat}>
                      <Sparkles size={15} />
                      {t.newChat}
                    </button>
                  </div>
                  <Messages
                    messages={active.messages}
                    language={language}
                    streaming={streaming}
                    notice={setToast}
                    regenerate={() => {
                      const last = active.messages.findLast(
                        (m) => m.role === "user",
                      );
                      if (last) void send(last.content, true);
                    }}
                    rate={(id, rating) =>
                      editConversation(active.id, {
                        messages: active.messages.map((m) =>
                          m.id === id
                            ? {
                                ...m,
                                rating:
                                  m.rating === rating ? undefined : rating,
                              }
                            : m,
                        ),
                      })
                    }
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="welcome"
                  className="welcome-transition"
                  initial={{ opacity: 0, y: reduced ? 0 : -24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    y: reduced ? 0 : -24,
                    filter: reduced ? "none" : "blur(8px)",
                  }}
                  transition={{ duration: reduced ? 0 : 0.4 }}
                >
                  <Welcome language={language} />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Keep this outside presence boundaries so FLIP preserves the live input. */}
            <Composer
              docked={Boolean(active)}
              language={language}
              streaming={streaming}
              send={(input) => void send(input)}
              stop={stop}
              notice={setToast}
            />
            <AnimatePresence mode="popLayout">
              {!active && (
                <motion.div
                  key="topics"
                  className="topics-transition"
                  initial={{ opacity: 0, y: reduced ? 0 : 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduced ? 0 : -24 }}
                  transition={{ duration: reduced ? 0 : 0.35 }}
                >
                  <TopicSuggestions
                    language={language}
                    topic={topic}
                    setTopic={setTopic}
                    send={(input) => void send(input)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Discovery
            language={language}
            openEcosystem={() => setEcosystemOpen(true)}
            onTopic={(index) => openTopics(index)}
          />
        </main>
        {ecosystemOpen && (
          <EcosystemMenu
            language={language}
            onClose={() => setEcosystemOpen(false)}
          />
        )}
        {historyOpen && (
          <HistoryPanel
            language={language}
            conversations={data || []}
            selected={selected}
            loading={isLoading}
            onClose={() => {
              setHistoryOpen(false);
              setActiveNav("chat");
            }}
            onNew={newChat}
            onSelect={(id) => {
              stop();
              setSelected(id);
              setHistoryOpen(false);
              setActiveNav("chat");
              scrollChat();
            }}
            onRename={(id, title) => editConversation(id, { title })}
            onPin={(id) =>
              editConversation(id, {
                pinned: !current.current.find((c) => c.id === id)?.pinned,
              })
            }
            onDelete={remove}
            onDeleteAll={() => remove()}
          />
        )}
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              role="status"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <span>{toast}</span>
              {undo && (
                <button
                  onClick={() => {
                    commit([
                      ...undo,
                      ...current.current.filter(
                        (c) => !undo.some((d) => d.id === c.id),
                      ),
                    ]);
                    setUndo(null);
                    setToast(null);
                  }}
                >
                  {t.undo}
                </button>
              )}
              <button
                className="icon-button"
                aria-label={t.close}
                onClick={() => {
                  setToast(null);
                  setUndo(null);
                }}
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
