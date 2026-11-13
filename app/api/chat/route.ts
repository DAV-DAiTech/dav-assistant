import { ObjectId } from "mongodb";
import { getAdapter } from "@/lib/chatbot";
import { collections, makeTitle, type ConversationDoc } from "@/lib/server/db";
import { ApiError, api, errorMessage, preflight } from "@/lib/server/http";
import { LIMITS, take } from "@/lib/server/rate-limit";
import { chatBody, readJson } from "@/lib/server/validation";
import { sseFrame } from "@/lib/shared/sse";
import type { Source } from "@/lib/shared/chat-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const OPTIONS = preflight;

export const POST = api(async (request, { clientId, ip, requestId }) => {
  if (!take(`chat:c:${clientId}`, LIMITS.chatClient) || !take(`chat:ip:${ip}`, LIMITS.chatIp))
    throw new ApiError("rate_limited", 429);
  const body = chatBody.parse(await readJson(request));
  const { conversations, messages } = await collections();
  const conversationId = body.conversationId ? new ObjectId(body.conversationId) : new ObjectId();
  const now = new Date();

  let conversation = await conversations.findOne({ _id: conversationId });
  if (conversation && conversation.clientId !== clientId) throw new ApiError("not_found", 404);
  if (!conversation) {
    if (body.regenerate) throw new ApiError("not_found", 404);
    const doc: ConversationDoc = {
      _id: conversationId,
      clientId,
      title: makeTitle(body.message),
      pinned: false,
      lang: body.lang,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    };
    try {
      await conversations.insertOne(doc);
      conversation = doc;
    } catch (error) {
      // A concurrent request may have created the same client-generated id first.
      if ((error as { code?: number }).code !== 11000) throw error;
      conversation = await conversations.findOne({ _id: conversationId, clientId });
      if (!conversation) throw new ApiError("not_found", 404);
    }
  }

  if (body.regenerate) {
    const last = await messages.findOne({ conversationId, clientId }, { sort: { createdAt: -1, _id: -1 } });
    if (last?.role === "assistant") {
      await messages.deleteOne({ _id: last._id, clientId });
      await conversations.updateOne({ _id: conversationId, clientId }, { $inc: { messageCount: -1 } });
    }
  } else {
    await messages.insertOne({
      _id: new ObjectId(),
      conversationId,
      clientId,
      role: "user",
      content: body.message,
      sources: [],
      suggestions: [],
      feedback: null,
      createdAt: now,
    });
    await conversations.updateOne(
      { _id: conversationId, clientId },
      { $set: { updatedAt: now, lang: body.lang }, $inc: { messageCount: 1 } },
    );
  }

  const assistantId = new ObjectId();
  const upstream = new AbortController();
  const onClientAbort = () => upstream.abort();
  request.signal.addEventListener("abort", onClientAbort, { once: true });
  const encoder = new TextEncoder();
  let content = "";
  let sources: Source[] = [];
  let suggestions: string[] = [];
  let saved = false;
  let closed = false;

  const persist = async () => {
    if (saved || !content.trim()) return;
    saved = true;
    const createdAt = new Date();
    await messages.insertOne({
      _id: assistantId,
      conversationId,
      clientId,
      role: "assistant",
      content,
      sources,
      suggestions,
      feedback: null,
      createdAt,
    });
    await conversations.updateOne(
      { _id: conversationId, clientId },
      { $set: { updatedAt: createdAt }, $inc: { messageCount: 1 } },
    );
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseFrame(event, data)));
        } catch {
          closed = true;
        }
      };
      send("meta", {
        conversationId: conversationId.toHexString(),
        messageId: assistantId.toHexString(),
        title: conversation!.title,
      });
      try {
        for await (const event of getAdapter().sendMessage({
          sessionId: conversationId.toHexString(),
          message: body.message,
          lang: body.lang,
          signal: upstream.signal,
        })) {
          if (event.type === "delta") {
            content += event.text;
            send("delta", { text: event.text });
          } else if (event.type === "sources") {
            sources = event.sources;
            send("sources", { sources });
          } else if (event.type === "suggestions") {
            suggestions = event.suggestions;
            send("suggestions", { suggestions });
          } else if (event.type === "status") {
            send("status", { status: event.status });
          } else if (event.type === "done") {
            await persist();
            send("done", { messageId: assistantId.toHexString() });
          } else {
            send("error", { code: event.code, message: errorMessage(event.code, body.lang) });
          }
        }
      } catch (error) {
        console.error("[chat] stream failed", { requestId, error: (error as Error)?.name });
        if (!upstream.signal.aborted)
          send("error", { code: "internal", message: errorMessage("internal", body.lang) });
      } finally {
        request.signal.removeEventListener("abort", onClientAbort);
        try {
          await persist();
        } catch (error) {
          console.error("[chat] persist failed", { requestId, error: (error as Error)?.name });
        }
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {}
        }
      }
    },
    cancel() {
      closed = true;
      upstream.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
});
