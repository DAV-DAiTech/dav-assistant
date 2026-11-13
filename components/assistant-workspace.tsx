"use client";

import { Mail, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { AppHeader } from "@/components/app-header";
import { ChatComposer } from "@/components/chat-composer";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { HistorySidebar } from "@/components/history-sidebar";
import { MessageList } from "@/components/message-list";
import { WelcomePanel } from "@/components/welcome-panel";
import type { ConversationDto, MessageDto } from "@/lib/types";

interface ConversationListResponse {
  conversations: ConversationDto[];
  nextCursor: string | null;
}

interface ConversationResponse {
  conversation: ConversationDto;
  messages: MessageDto[];
  nextCursor: string | null;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Request failed");
  return response.json();
};

export function AssistantWorkspace() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileHistory, setMobileHistory] = useState(false);
  const [dark, setDark] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "rename" | "delete"; conversation: ConversationDto } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { mutate } = useSWRConfig();

  const { data: listData, isLoading: historyLoading } = useSWR<ConversationListResponse>("/api/conversations?limit=50", fetcher, {
    revalidateOnFocus: false,
  });
  const messageKey = selectedId ? `/api/conversations/${selectedId}?limit=100` : null;
  const { data: conversationData, isLoading: messagesLoading } = useSWR<ConversationResponse>(messageKey, fetcher, {
    revalidateOnFocus: false,
  });
  const { data: health } = useSWR<{ status: "online" | "offline" }>("/api/health", fetcher, {
    refreshInterval: 30_000,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const conversations = listData?.conversations || [];
  const messages = conversationData?.messages || [];
  const activeConversation = conversationData?.conversation || conversations.find((item) => item.id === selectedId);

  function newChat() {
    abortRef.current?.abort();
    setStreaming(false);
    setSelectedId(null);
    setNotice(null);
    setMobileHistory(false);
  }

  function selectConversation(id: string) {
    abortRef.current?.abort();
    setStreaming(false);
    setSelectedId(id);
    setNotice(null);
    setMobileHistory(false);
  }

  async function createConversation() {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "New conversation" }),
    });
    if (!response.ok) throw new Error("Unable to create a conversation");
    const conversation = (await response.json()) as ConversationDto;
    await mutate("/api/conversations?limit=50");
    return conversation;
  }

  async function sendMessage(input: string) {
    if (streaming) return;
    setNotice(null);
    let conversation = activeConversation;
    let keyToRefresh: string | null = null;
    try {
      if (!conversation) conversation = await createConversation();
      const id = conversation.id;
      const key = `/api/conversations/${id}?limit=100`;
      keyToRefresh = key;
      setSelectedId(id);
      const optimisticUser: MessageDto = {
        id: `temp-${Date.now()}`,
        conversationId: id,
        role: "user",
        content: input,
        createdAt: new Date().toISOString(),
      };
      await mutate(
        key,
        (current: ConversationResponse | undefined) => ({
          conversation: current?.conversation || conversation!,
          messages: [...(current?.messages || []), optimisticUser],
          nextCursor: current?.nextCursor || null,
        }),
        { revalidate: false },
      );

      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: id, message: input }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error("Unable to reach DAV Assistant");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedText = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
        let cut = buffer.indexOf("\n\n");
        while (cut >= 0) {
          const block = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          const payload = block.startsWith("data: ") ? block.slice(6) : "";
          if (payload) {
            const event = JSON.parse(payload);
            if (event.type === "USER_MESSAGE") {
              await mutate(key, (current: ConversationResponse | undefined) => ({
                ...current!,
                messages: (current?.messages || []).map((message) => message.id === optimisticUser.id ? event.message : message),
              }), { revalidate: false });
            }
            if (event.type === "TEXT_MESSAGE_CONTENT" || event.type === "TEXT_MESSAGE_CHUNK") {
              streamedText += event.delta || "";
              const streamingMessage: MessageDto = {
                id: "streaming",
                conversationId: id,
                role: "assistant",
                content: streamedText,
                createdAt: new Date().toISOString(),
              };
              await mutate(key, (current: ConversationResponse | undefined) => {
                const currentMessages = current?.messages || [];
                const exists = currentMessages.some((message) => message.id === "streaming");
                return { ...current!, messages: exists ? currentMessages.map((message) => message.id === "streaming" ? streamingMessage : message) : [...currentMessages, streamingMessage] };
              }, { revalidate: false });
            }
            if (event.type === "DONE") {
              await mutate(key, (current: ConversationResponse | undefined) => ({
                ...current!,
                messages: (current?.messages || []).map((message) => message.id === "streaming" ? event.message : message),
              }), { revalidate: false });
            }
            if (event.type === "RUN_ERROR") throw new Error(event.message || "The assistant is temporarily unavailable");
          }
          cut = buffer.indexOf("\n\n");
        }
      }
      await mutate("/api/conversations?limit=50");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice(error instanceof Error ? error.message : "The assistant is temporarily unavailable");
    } finally {
      abortRef.current = null;
      setStreaming(false);
      void mutate("/api/conversations?limit=50");
      if (keyToRefresh) void mutate(keyToRefresh);
    }
  }

  async function confirmModal(value?: string) {
    if (!modal) return;
    const response = await fetch(`/api/conversations/${modal.conversation.id}`, {
      method: modal.mode === "delete" ? "DELETE" : "PATCH",
      headers: modal.mode === "rename" ? { "content-type": "application/json" } : undefined,
      body: modal.mode === "rename" ? JSON.stringify({ title: value }) : undefined,
    });
    if (!response.ok) {
      setNotice(`Unable to ${modal.mode} this conversation`);
      setModal(null);
      return;
    }
    if (modal.mode === "delete" && selectedId === modal.conversation.id) newChat();
    setModal(null);
    await mutate("/api/conversations?limit=50");
    if (modal.mode === "rename" && messageKey) await mutate(messageKey);
  }

  const status = health?.status || "checking";

  return (
    <main className="app-shell">
      <AppHeader dark={dark} onHistory={() => setMobileHistory(true)} onNew={newChat} onTheme={() => setDark((current) => !current)} />
      <div className="app-body">
        <HistorySidebar
          conversations={conversations}
          activeId={selectedId}
          mobileOpen={mobileHistory}
          loading={historyLoading}
          onClose={() => setMobileHistory(false)}
          onNew={newChat}
          onSelect={selectConversation}
          onRename={(conversation) => setModal({ mode: "rename", conversation })}
          onDelete={(conversation) => setModal({ mode: "delete", conversation })}
        />
        <section className="workspace" aria-label="DAV Assistant conversation">
          {activeConversation && <div className="conversation-title"><span>{activeConversation.title}</span></div>}
          <div className="workspace-content">
            {!selectedId ? <WelcomePanel onPrompt={sendMessage} /> : messagesLoading && !conversationData ? <div className="loading-panel">Loading conversation…</div> : <MessageList messages={messages} streaming={streaming} />}
            {notice && <div className="error-notice" role="alert">{notice}<button type="button" onClick={() => setNotice(null)}>Dismiss</button></div>}
          </div>
          <ChatComposer streaming={streaming} onSend={sendMessage} onStop={() => abortRef.current?.abort()} />
          <footer className="app-footer">
            <span><ShieldCheck size={13} /> Responses can contain errors. Verify important details with DAV.</span>
            <span className={`connection-status status-${status}`}>{status === "offline" ? <WifiOff size={13} /> : <Wifi size={13} />} {status === "checking" ? "Checking" : status === "online" ? "Online" : "Offline"}</span>
            <a href="mailto:info@dav.edu.vn"><Mail size={13} /> Contact DAV</a>
          </footer>
        </section>
      </div>
      {modal && <ConfirmationModal mode={modal.mode} conversation={modal.conversation} onCancel={() => setModal(null)} onConfirm={confirmModal} />}
    </main>
  );
}
