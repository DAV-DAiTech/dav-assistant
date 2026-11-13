import { ZodError } from "zod";
import { backendErrors } from "@/lib/frontend/i18n";
import type { ErrorCode, Lang } from "@/lib/shared/chat-types";
import { RETENTION_DAYS } from "./db";
import { LIMITS, clientIp, take } from "./rate-limit";

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
  ) {
    super(code);
  }
}

export interface ApiContext {
  clientId: string;
  requestId: string;
  lang: Lang;
  ip: string;
}

const COOKIE = "dav_cid";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const errorMessage = (code: ErrorCode, lang: Lang) => backendErrors[lang][code];

function readCookie(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** The httpOnly cookie wins; the x-client-id header covers browsers that block cookies in iframes. */
function resolveClientId(request: Request) {
  const cookie = readCookie(request, COOKIE);
  if (cookie && UUID.test(cookie)) return { clientId: cookie.toLowerCase(), fresh: false };
  const header = request.headers.get("x-client-id");
  if (header && UUID.test(header)) return { clientId: header.toLowerCase(), fresh: true };
  return { clientId: crypto.randomUUID(), fresh: true };
}

function sameHost(origin: string, request: Request) {
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function originAllowed(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === process.env.ALLOWED_ORIGIN || sameHost(origin, request);
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (origin && process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN)
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    };
  return { Vary: "Origin" };
}

export function preflight(request: Request) {
  if (!originAllowed(request)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(request),
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-client-id, x-lang",
      "Access-Control-Max-Age": "600",
    },
  });
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function errorResponse(code: ErrorCode, status: number, lang: Lang) {
  return json({ error: { code, message: errorMessage(code, lang) } }, status);
}

function classify(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) return new ApiError("invalid_input", 400);
  const name = (error as { name?: string })?.name ?? "";
  if (name.startsWith("Mongo")) return new ApiError("database", 503);
  return new ApiError("internal", 500);
}

export function api<Extra = unknown>(
  handler: (request: Request, ctx: ApiContext, extra: Extra) => Promise<Response>,
  options: { rateLimit?: boolean } = {},
) {
  return async (request: Request, extra: Extra) => {
    const requestId = crypto.randomUUID().slice(0, 8);
    const lang: Lang = request.headers.get("x-lang") === "en" ? "en" : "vi";
    const { clientId, fresh } = resolveClientId(request);
    const ctx: ApiContext = { clientId, requestId, lang, ip: clientIp(request) };
    let response: Response;
    if (!originAllowed(request)) response = errorResponse("forbidden", 403, lang);
    else if (options.rateLimit !== false && !take(`api:c:${clientId}`, LIMITS.apiClient))
      response = errorResponse("rate_limited", 429, lang);
    else {
      try {
        response = await handler(request, ctx, extra);
      } catch (error) {
        const apiError = classify(error);
        if (apiError.status >= 500)
          console.error("[api] request failed", {
            requestId,
            status: apiError.status,
            code: apiError.code,
            error: (error as { name?: string; code?: unknown })?.name,
          });
        response = errorResponse(apiError.code, apiError.status, lang);
      }
    }
    for (const [key, value] of Object.entries(corsHeaders(request))) response.headers.set(key, value);
    response.headers.set("x-request-id", requestId);
    if (fresh)
      response.headers.append(
        "Set-Cookie",
        `${COOKIE}=${clientId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${RETENTION_DAYS * 86400}`,
      );
    if (response.status >= 400) console.info("[api]", { requestId, status: response.status });
    return response;
  };
}
