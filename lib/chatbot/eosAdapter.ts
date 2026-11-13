import { parseSse } from "@/lib/shared/sse";
import type {
  ChatEvent,
  SendMessageArgs,
  Source,
} from "@/lib/shared/chat-types";

const DEFAULT_URL = "https://console-agents.fpt.ai/direct-bff/v1/runs";
const IDLE_TIMEOUT_MS = 60_000;
const MAX_SOURCES = 8;
const MAX_SUGGESTIONS = 6;

export function eosConfigured() {
  return Boolean(process.env.EOS_API_KEY && process.env.EOS_AGENT_ID?.trim());
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function debugKeys(label: string, value: unknown) {
  if (process.env.DEBUG_EOS !== "true" || !isObject(value)) return;
  const nested = Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => isObject(v))
      .map(([k, v]) => [k, Object.keys(v as Json)]),
  );
  console.debug(`[eos] ${label} keys`, Object.keys(value), nested);
}

function findArray(payload: Json, key: string): unknown[] | null {
  if (payload.name === key && Array.isArray(payload.value)) return payload.value;
  for (const candidate of [payload, payload.value, payload.data, payload.payload]) {
    if (isObject(candidate) && Array.isArray(candidate[key]))
      return candidate[key] as unknown[];
  }
  return null;
}

export function extractSources(payload: Json): Source[] {
  const list = findArray(payload, "references");
  if (!list) return [];
  const seen = new Set<string>();
  const sources: Source[] = [];
  for (const item of list) {
    if (!isObject(item)) continue;
    const url = str(item.url) || str(item.link) || str(item.href) || str(item.source);
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    const title =
      str(item.title) || str(item.name) || str(item.label) || new URL(url).hostname;
    sources.push({ title: title.slice(0, 160), url });
    if (sources.length >= MAX_SOURCES) break;
  }
  return sources;
}

export function extractSuggestions(payload: Json): string[] {
  const blocks = findArray(payload, "ui_blocks");
  if (!blocks) return [];
  const out = new Set<string>();
  for (const block of blocks) {
    if (!isObject(block)) continue;
    const items = [block.buttons, block.items, block.options, block.actions].find(
      Array.isArray,
    ) as unknown[] | undefined;
    for (const item of items ?? [block]) {
      if (typeof item === "string") out.add(item.trim());
      else if (isObject(item)) {
        const label =
          str(item.label) || str(item.title) || str(item.text) || str(item.payload);
        if (label) out.add(label);
      }
    }
  }
  return [...out].filter(Boolean).map((s) => s.slice(0, 200)).slice(0, MAX_SUGGESTIONS);
}

function isNetworkError(error: unknown) {
  return error instanceof TypeError || (error as { name?: string })?.name === "FetchError";
}

export async function* sendMessage({
  sessionId,
  message,
  signal,
}: SendMessageArgs): AsyncGenerator<ChatEvent> {
  const apiKey = process.env.EOS_API_KEY;
  const agentId = process.env.EOS_AGENT_ID?.trim();
  if (!apiKey || !agentId) {
    yield { type: "error", code: "config" };
    return;
  }
  const timeout = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => timeout.abort(), IDLE_TIMEOUT_MS);
  };
  const combined = AbortSignal.any([signal, timeout.signal]);
  arm();
  try {
    let response: Response | null = null;
    for (let attempt = 0; attempt < 2 && !response; attempt++) {
      try {
        response = await fetch(process.env.EOS_API_URL || DEFAULT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          // agentId stays a string: it has 18 digits and would lose precision as a number.
          body: JSON.stringify({ agentId: String(agentId), sessionId, input: message }),
          signal: combined,
        });
      } catch (error) {
        if (signal.aborted) return;
        if (timeout.signal.aborted || attempt === 1 || !isNetworkError(error)) {
          console.error("[eos] request failed", { code: timeout.signal.aborted ? "timeout" : "network" });
          yield { type: "error", code: "unavailable" };
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    if (!response) return;
    if (!response.ok || !response.body) {
      console.error("[eos] upstream status", { status: response.status });
      response.body?.cancel().catch(() => {});
      const code =
        response.status === 401 || response.status === 403
          ? "config"
          : response.status === 429
            ? "rate_limited"
            : "upstream";
      yield { type: "error", code };
      return;
    }
    let hasContent = false;
    let searching = false;
    for await (const raw of parseSse(response.body)) {
      arm();
      let event: unknown;
      try {
        event = JSON.parse(raw.data);
      } catch {
        continue;
      }
      if (!isObject(event)) continue;
      const type = str(event.type);
      if (type === "TEXT_MESSAGE_CONTENT") {
        const delta = typeof event.delta === "string" ? event.delta : "";
        if (delta) {
          hasContent = true;
          yield { type: "delta", text: delta };
        }
      } else if (type.startsWith("TOOL_CALL_")) {
        if (!searching) {
          searching = true;
          yield { type: "status", status: "searching" };
        }
      } else if (type === "CUSTOM") {
        debugKeys("custom", event);
        const sources = extractSources(event);
        if (sources.length) yield { type: "sources", sources };
        const suggestions = extractSuggestions(event);
        if (suggestions.length) yield { type: "suggestions", suggestions };
      } else if (type === "RUN_FINISHED") {
        yield { type: "done" };
        return;
      } else if (type === "RUN_ERROR") {
        const upstreamCode = str(event.code) || "unknown";
        console.error("[eos] run error", { code: upstreamCode });
        yield { type: "error", code: "upstream", upstreamCode };
        return;
      }
    }
    if (signal.aborted) return;
    if (timeout.signal.aborted) yield { type: "error", code: "unavailable" };
    else if (hasContent) yield { type: "done" };
    else yield { type: "error", code: "upstream" };
  } catch {
    if (signal.aborted) return;
    console.error("[eos] stream interrupted", {
      code: timeout.signal.aborted ? "timeout" : "network",
    });
    yield { type: "error", code: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
