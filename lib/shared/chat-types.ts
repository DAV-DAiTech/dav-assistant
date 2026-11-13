export type Lang = "vi" | "en";

export type ErrorCode =
  | "invalid_input"
  | "not_found"
  | "forbidden"
  | "rate_limited"
  | "config"
  | "unavailable"
  | "upstream"
  | "database"
  | "internal";

export interface Source {
  title: string;
  url: string;
}

export type ChatEvent =
  | { type: "delta"; text: string }
  | { type: "sources"; sources: Source[] }
  | { type: "suggestions"; suggestions: string[] }
  | { type: "status"; status: "searching" }
  | { type: "done" }
  | { type: "error"; code: ErrorCode; upstreamCode?: string };

export interface SendMessageArgs {
  sessionId: string;
  message: string;
  lang: Lang;
  signal: AbortSignal;
}
