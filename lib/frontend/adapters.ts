import { text, type Language } from "./i18n";
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  rating?: "up" | "down";
}
export interface LocalConversation {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: number;
  messages: ChatMessage[];
}
export interface HistoryStore {
  load(): Promise<LocalConversation[]>;
  save(conversations: LocalConversation[]): Promise<void>;
}
const STORAGE_KEY = "dav.history.v4";
// This boundary is deliberately asynchronous so an API store can replace localStorage without changing the UI.
export const historyStore: HistoryStore = {
  async load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) throw new Error("Invalid history");
    return value.filter((c): c is LocalConversation =>
      Boolean(
        c &&
        typeof c.id === "string" &&
        typeof c.title === "string" &&
        typeof c.updatedAt === "number" &&
        Array.isArray(c.messages) &&
        c.messages.every(
          (m: ChatMessage) =>
            typeof m.id === "string" &&
            ["user", "assistant"].includes(m.role) &&
            typeof m.content === "string" &&
            typeof m.createdAt === "number",
        ),
      ),
    );
  },
  async save(conversations) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  },
};
export interface ChatAdapter {
  stream(
    input: string,
    language: Language,
    signal: AbortSignal,
  ): AsyncIterable<string>;
}
// No network requests, credentials, uploads, or personal data leave the browser in this demo.
export const mockChatAdapter: ChatAdapter = {
  async *stream(_input, language, signal) {
    const chunks = text[language].demoReply.match(/[\s\S]{1,24}/g) || [];
    for (const chunk of chunks) {
      if (signal.aborted) return;
      await new Promise<void>((resolve) => setTimeout(resolve, 30));
      if (signal.aborted) return;
      yield chunk;
    }
  },
};
