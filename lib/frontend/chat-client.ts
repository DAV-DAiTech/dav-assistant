import { parseSse } from "@/lib/shared/sse";
import type { ErrorCode, Lang, Source } from "@/lib/shared/chat-types";
import { ApiRequestError, apiFetch, localizedError } from "./api";

export interface ChatCallbacks {
  onMeta?: (meta: { conversationId: string; messageId: string; title: string }) => void;
  onDelta?: (text: string) => void;
  onSources?: (sources: Source[]) => void;
  onSuggestions?: (suggestions: string[]) => void;
  onStatus?: (status: "searching") => void;
  onDone?: (result: { messageId: string }) => void;
  onError?: (error: { code: ErrorCode; message: string }) => void;
}

export interface SendOptions {
  conversationId: string;
  message: string;
  lang: Lang;
  regenerate?: boolean;
  signal: AbortSignal;
}

export const chatClient = {
  async sendMessage(options: SendOptions, callbacks: ChatCallbacks): Promise<void> {
    const { signal, ...body } = options;
    const fail = (error: unknown) => {
      if (signal.aborted) return;
      const e = error instanceof ApiRequestError ? error : localizedError("unavailable", options.lang);
      callbacks.onError?.({ code: e.code, message: e.message });
    };
    let response: Response;
    try {
      response = await apiFetch("/api/chat", { method: "POST", json: body, signal });
    } catch (error) {
      return fail(error);
    }
    if (!response.body) return fail(null);
    let finished = false;
    try {
      for await (const { event, data } of parseSse(response.body)) {
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }
        if (event === "meta") callbacks.onMeta?.(payload as never);
        else if (event === "delta" && typeof payload.text === "string") callbacks.onDelta?.(payload.text);
        else if (event === "sources" && Array.isArray(payload.sources)) callbacks.onSources?.(payload.sources as Source[]);
        else if (event === "suggestions" && Array.isArray(payload.suggestions))
          callbacks.onSuggestions?.(payload.suggestions as string[]);
        else if (event === "status") callbacks.onStatus?.("searching");
        else if (event === "done") {
          finished = true;
          callbacks.onDone?.(payload as { messageId: string });
        } else if (event === "error") {
          finished = true;
          callbacks.onError?.(payload as { code: ErrorCode; message: string });
        }
      }
    } catch (error) {
      return fail(error);
    }
    if (!finished) fail(null);
  },
};
