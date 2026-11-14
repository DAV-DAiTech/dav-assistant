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
  fetchHealth,
  historyStore,
  type LocalConversation,
  type ChatMessage,
} from "@/lib/frontend/adapters";
import { setApiLanguage } from "@/lib/frontend/api";
import { chatClient } from "@/lib/frontend/chat-client";
import { newObjectId } from "@/lib/clientId";
import { text, type Language } from "@/lib/frontend/i18n";
import { AmbientBackground } from "./primitives";
import { Header, type Theme } from "./header";
import { EcosystemMenu } from "./ecosystem-menu";
import { Welcome, Discovery } from "./welcome";
import { Composer } from "./composer";
import { TopicSuggestions } from "./topics";
import { HistoryPanel } from "./history";
import { Messages } from "./messages";

export function DavWorkspace() {
  const reduced = useReducedMotion();
  const [language, setLanguage] = useState<Language>("vi");
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);
  const [topic, setTopic] = useState(0);
  const [activeNav, setActiveNav] = useState("chat");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ecosystemOpen, setEcosystemOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [browserOnline, setOnline] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [undo, setUndo] = useState<LocalConversation[] | null>(null);
  const controller = useRef<AbortController | null>(null);
  const current = useRef<LocalConversation[]>([]);
  const pendingDelete = useRef<{ ids: string[] | null; timer: ReturnType<typeof setTimeout> } | null>(null);
  const t = text[language];
  setApiLanguage(language);
  const { data, isLoading, error, mutate } = useSWR(
    "dav-history-api-v1",
    () => historyStore.load(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );
  const health = useSWR("dav-health-v1", fetchHealth, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    refreshInterval: 120_000,
  });
  const online =
    browserOnline && !health.error && health.data?.status !== "degraded";
  useEffect(() => {
    if (data) current.current = data;
  }, [data]);
  useEffect(() => {
    const flush = () => flushDelete();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);
  useEffect(() => {
    if (!selected) return;
    const conversation = current.current.find((c) => c.id === selected);
    if (!conversation || conversation.loaded !== false) return;
    let cancelled = false;
    historyStore
      .get(selected)
      .then((full) => {
        if (cancelled || !full) return;
        commit(
          current.current.map((c) =>
            c.id === full.id && c.loaded === false ? full : c,
          ),
        );
      })
      .catch(() => !cancelled && setToast(t.storageError));
    return () => {
      cancelled = true;
    };
  }, [selected, data, t.storageError]);
  useEffect(() => {
    try {
      const preference = localStorage.getItem("dav.theme.v4");
      if (["light", "dark", "system"].includes(preference || ""))
        setTheme(preference as Theme);
      const lang = localStorage.getItem("dav.language.v4");
      if (lang === "en" || lang === "vi") setLanguage(lang);
    } catch {
      /* Denied preference storage must not prevent use of the workspace. */
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
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "light" ? "#FFFFFF" : "#080F1F");
    };
    apply();
    media.addEventListener("change", apply);
    document.documentElement.lang = language;
    document.title = `DAV Assistant — ${t.clubFullName}`;
    const description = language === "vi"
      ? `Trợ lý AI song ngữ do ${t.clubFullName} phát triển. Khám phá tuyển sinh, học phí, học bổng và cuộc sống sinh viên.`
      : `A bilingual AI assistant by ${t.clubFullName}. Explore admissions, tuition, scholarships, and student life.`;
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'])
      document.querySelector(selector)?.setAttribute("content", description);
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]'])
      document.querySelector(selector)?.setAttribute("content", document.title);
    document.querySelector('meta[property="og:locale"]')?.setAttribute("content", language === "vi" ? "vi_VN" : "en_US");
    try {
      localStorage.setItem("dav.theme.v4", theme);
      localStorage.setItem("dav.language.v4", language);
    } catch {
      /* A storage error must not prevent theme or language changes. */
    }
    return () => media.removeEventListener("change", apply);
  }, [theme, language, ready, t.clubFullName]);
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

  function commit(next: LocalConversation[]) {
    current.current = next;
    void mutate(next, { revalidate: false });
  }
  function updateConversation(
    id: string,
    update: (c: LocalConversation) => LocalConversation,
  ) {
    commit(current.current.map((c) => (c.id === id ? update(c) : c)));
  }
  function flushDelete() {
    const pending = pendingDelete.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingDelete.current = null;
    const request = pending.ids
      ? Promise.all(pending.ids.map((id) => historyStore.remove(id)))
      : historyStore.removeAll();
    void request.catch(() => {
      setToast(t.storageError);
      void mutate();
    });
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
    const id = selected || newObjectId();
    let conversation = current.current.find((c) => c.id === id) || {
      id,
      title: input.trim().replace(/\s+/g, " ").slice(0, 60),
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
    let replyId = reply.id;
    const patchReply = (change: (m: ChatMessage) => ChatMessage) =>
      updateConversation(id, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === replyId ? change(m) : m)),
      }));
    try {
      await chatClient.sendMessage(
        { conversationId: id, message: input, lang: language, regenerate, signal: abort.signal },
        {
          onMeta: ({ messageId, title }) => {
            patchReply((m) => ({ ...m, id: messageId }));
            replyId = messageId;
            updateConversation(id, (c) => ({ ...c, title, loaded: true }));
          },
          onDelta: (chunk) => {
            if (!abort.signal.aborted)
              patchReply((m) => ({ ...m, content: m.content + chunk }));
          },
          onSources: (sources) => patchReply((m) => ({ ...m, sources })),
          onSuggestions: (suggestions) =>
            patchReply((m) => ({ ...m, suggestions })),
          onDone: () => void health.mutate(),
          onError: ({ code, message }) => {
            setToast(message);
            if (code === "unavailable" || code === "upstream" || code === "config")
              void health.mutate();
          },
        },
      );
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        setStreaming(false);
      }
      updateConversation(id, (c) => ({
        ...c,
        messages: c.messages.filter(
          (m) => m.role !== "assistant" || m.content.length > 0,
        ),
      }));
    }
  }
  function editConversation(id: string, changes: Pick<Partial<LocalConversation>, "title" | "pinned">) {
    const before = current.current.find((c) => c.id === id);
    if (!before) return;
    updateConversation(id, (c) => ({ ...c, ...changes }));
    const request =
      changes.title !== undefined
        ? historyStore.rename(id, changes.title)
        : historyStore.pin(id, Boolean(changes.pinned));
    void request.catch(() => {
      updateConversation(id, (c) => ({ ...c, title: before.title, pinned: before.pinned }));
      setToast(t.storageError);
    });
  }
  function rateMessage(conversationId: string, messageId: string, rating: "up" | "down") {
    const message = current.current
      .find((c) => c.id === conversationId)
      ?.messages.find((m) => m.id === messageId);
    if (!message) return;
    const previous = message.rating;
    const next = previous === rating ? undefined : rating;
    const setRating = (value: typeof previous) =>
      updateConversation(conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === messageId ? { ...m, rating: value } : m)),
      }));
    setRating(next);
    void historyStore.feedback(messageId, next ?? null).catch(() => {
      setRating(previous);
      setToast(t.storageError);
    });
  }
  function remove(id?: string) {
    stop();
    flushDelete();
    const removed = current.current.filter((c) => !id || c.id === id);
    setUndo(removed);
    commit(id ? current.current.filter((c) => c.id !== id) : []);
    if (!id || selected === id) setSelected(null);
    setToast(t.deleted);
    // The server delete waits for the undo window so restoring needs no re-upload.
    pendingDelete.current = { ids: id ? [id] : null, timer: setTimeout(flushDelete, 8000) };
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
          ecosystemOpen={ecosystemOpen}
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
              {!online && (
                <button
                  className="icon-button"
                  aria-label={t.retry}
                  onClick={() => {
                    setOnline(navigator.onLine);
                    void health.mutate();
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
                    rate={(id, rating) => rateMessage(active.id, id, rating)}
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
                    if (pendingDelete.current) {
                      clearTimeout(pendingDelete.current.timer);
                      pendingDelete.current = null;
                    }
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
