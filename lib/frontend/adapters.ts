import type { Source } from "@/lib/shared/chat-types";
import { apiFetch, apiJson } from "./api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  rating?: "up" | "down";
  sources?: Source[];
  suggestions?: string[];
}
export interface LocalConversation {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: number;
  messages: ChatMessage[];
  /** False until the messages for a listed conversation have been fetched. */
  loaded?: boolean;
}

interface ApiConversation {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: number;
}
interface ApiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  suggestions: string[];
  feedback: "up" | "down" | null;
  createdAt: number;
}
interface Page {
  items: ApiConversation[];
  nextCursor: string | null;
}

const MAX_PAGES = 4;
const toLocal = (c: ApiConversation): LocalConversation => ({
  id: c.id,
  title: c.title,
  pinned: c.pinned,
  updatedAt: c.updatedAt,
  messages: [],
  loaded: false,
});
const toMessage = (m: ApiMessage): ChatMessage => ({
  id: m.id,
  role: m.role,
  content: m.content,
  createdAt: m.createdAt,
  rating: m.feedback ?? undefined,
  sources: m.sources,
  suggestions: m.suggestions,
});

async function list(options: { q?: string; cursor?: string; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (options.q) params.set("q", options.q);
  if (options.cursor) params.set("cursor", options.cursor);
  params.set("limit", String(options.limit ?? 50));
  const page = await apiJson<Page>(`/api/conversations?${params}`);
  return { items: page.items.map(toLocal), nextCursor: page.nextCursor };
}

const conversationPath = (id: string) => `/api/conversations/${encodeURIComponent(id)}`;
const ignoreMissing = (error: unknown) => {
  if ((error as { status?: number })?.status !== 404) throw error;
};

export const historyStore = {
  list,
  async load(): Promise<LocalConversation[]> {
    const all: LocalConversation[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await list({ cursor });
      all.push(...result.items);
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
    return all;
  },
  async search(q: string) {
    return (await list({ q })).items;
  },
  async get(id: string): Promise<LocalConversation | null> {
    try {
      const data = await apiJson<ApiConversation & { messages: ApiMessage[] }>(conversationPath(id));
      return { ...toLocal(data), messages: data.messages.map(toMessage), loaded: true };
    } catch (error) {
      ignoreMissing(error);
      return null;
    }
  },
  async rename(id: string, title: string) {
    await apiFetch(conversationPath(id), { method: "PATCH", json: { title } });
  },
  async pin(id: string, pinned: boolean) {
    await apiFetch(conversationPath(id), { method: "PATCH", json: { pinned } });
  },
  async remove(id: string) {
    await apiFetch(conversationPath(id), { method: "DELETE", keepalive: true }).catch(ignoreMissing);
  },
  async removeAll() {
    await apiFetch("/api/conversations", { method: "DELETE", keepalive: true });
  },
  async feedback(messageId: string, value: "up" | "down" | null) {
    await apiFetch("/api/feedback", { method: "POST", json: { messageId, value } });
  },
};
export type HistoryStore = typeof historyStore;

export async function fetchHealth() {
  return apiJson<{ status: "ok" | "degraded"; mongo: "ok" | "error"; eos: "configured" | "missing"; mock: boolean }>(
    "/api/health",
  );
}
