import { getClientId } from "@/lib/clientId";
import type { ErrorCode, Lang } from "@/lib/shared/chat-types";
import { backendErrors } from "./i18n";

let currentLang: Lang = "vi";
export const setApiLanguage = (lang: Lang) => {
  currentLang = lang;
};
export const getApiLanguage = () => currentLang;

export class ApiRequestError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const localizedError = (code: ErrorCode, lang = currentLang) =>
  new ApiRequestError(code, 0, backendErrors[lang][code]);

export async function apiFetch(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      credentials: "same-origin",
      headers: {
        "x-client-id": getClientId(),
        "x-lang": currentLang,
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    throw localizedError("unavailable");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const code: ErrorCode = payload?.error?.code ?? "internal";
    throw new ApiRequestError(
      code,
      response.status,
      payload?.error?.message ?? backendErrors[currentLang][code] ?? backendErrors[currentLang].internal,
    );
  }
  return response;
}

export async function apiJson<T>(path: string, init?: RequestInit & { json?: unknown }) {
  return (await (await apiFetch(path, init)).json()) as T;
}
