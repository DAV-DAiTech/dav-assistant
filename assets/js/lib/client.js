import { CHAT } from "../config/app-config.js";
import { getLang } from "../i18n.js";

export class ChatError extends Error {
  constructor(code, message, status) {
    super(message || code);
    this.code = code;
    this.status = status;
  }
}

const withTimeout = (ms) => (typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);

async function readError(res) {
  let data = null;
  try { data = await res.json(); } catch { /* not json */ }
  const code = data?.code || (res.status === 429 ? "RATE_LIMITED" : `HTTP_${res.status}`);
  return new ChatError(code, data?.message, res.status);
}

export class ChatClient {
  constructor(config = CHAT) {
    this.config = config;
    this.session = null;
    this.pending = null;
  }

  get fresh() {
    return !!this.session && Date.parse(this.session.expiresAt) - Date.now() > 60_000;
  }

  ensureSession({ newConversation = false } = {}) {
    if (!newConversation && this.fresh) return Promise.resolve(this.session);
    if (this.pending) return this.pending;
    const body = { connectionKey: this.config.connectionKey, locale: getLang() };
    if (this.session?.token) body.visitorToken = this.session.token;
    if (newConversation) body.newConversation = true;
    this.pending = (async () => {
      let res;
      try {
        res = await fetch(`${this.config.apiBase}/visitor/session`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: withTimeout(15_000),
        });
      } catch (err) {
        throw new ChatError("NETWORK", err.message);
      }
      if (!res.ok) throw await readError(res);
      const data = await res.json();
      this.session = { token: data.visitorToken, sessionId: data.sessionId, expiresAt: data.expiresAt };
      return this.session;
    })().finally(() => { this.pending = null; });
    return this.pending;
  }

  #auth(extra = {}) {
    return { authorization: `Bearer ${this.session.token}`, ...extra };
  }

  async *run(input, { attachments, signal } = {}) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const session = await this.ensureSession();
      const body = { sessionId: session.sessionId, input };
      if (attachments?.length) body.attachments = attachments;
      let res;
      try {
        res = await fetch(`${this.config.apiBase}/runs`, {
          method: "POST",
          headers: this.#auth({ "content-type": "application/json", accept: "text/event-stream" }),
          body: JSON.stringify(body),
          signal,
        });
      } catch (err) {
        if (err.name === "AbortError") throw err;
        throw new ChatError("NETWORK", err.message);
      }
      if (res.status === 401 && attempt === 0) { this.session.expiresAt = 0; continue; }
      if (!res.ok) throw await readError(res);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
          let cut;
          while ((cut = buffer.indexOf("\n\n")) >= 0) {
            const chunk = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            const data = chunk.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
            if (!data) continue;
            try { yield JSON.parse(data); } catch { /* skip malformed frame */ }
          }
        }
      } catch (err) {
        if (err.name === "AbortError") throw err;
        throw new ChatError("NETWORK", err.message);
      }
      return;
    }
  }

  async feedback(messageId, rating) {
    await this.ensureSession();
    const res = await fetch(`${this.config.apiBase}/visitor/feedback`, {
      method: "POST",
      headers: this.#auth({ "content-type": "application/json" }),
      body: JSON.stringify({ messageId, rating }),
    });
    if (!res.ok) throw await readError(res);
  }

  async upload(file) {
    await this.ensureSession();
    const form = new FormData();
    form.append("file", file, file.name);
    const res = await fetch(`${this.config.apiBase}/visitor/uploads`, { method: "POST", headers: this.#auth(), body: form });
    if (!res.ok) throw await readError(res);
    const data = await res.json();
    return { objectKey: data.objectKey, name: data.name, mimeType: data.mimeType, sizeBytes: data.sizeBytes };
  }
}
