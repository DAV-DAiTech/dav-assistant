import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { asMessage, getVisitorId, safeText } from "@/lib/server";
import type { ConversationDocument, MessageDocument } from "@/lib/types";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();
const FPT_API_BASE = process.env.FPT_API_BASE || "https://console-agents.fpt.ai/direct-bff/v1";
const FPT_ALLOWED_ORIGIN = process.env.FPT_ALLOWED_ORIGIN || "https://dav-daitech.github.io";
const LEGACY_PUBLIC_CONNECTION_KEY = "wgt__u-Owby-sZBPvCC0_5h-Gw";

type FptEvent = {
  type?: string;
  delta?: string;
  messageId?: string;
  code?: string;
  message?: string;
};

function frame(payload: unknown) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

async function ensureFptSession(conversation: ConversationDocument) {
  if (
    conversation.fptSessionId &&
    conversation.fptVisitorToken &&
    conversation.fptExpiresAt &&
    conversation.fptExpiresAt.valueOf() - Date.now() > 60_000
  ) {
    return {
      sessionId: conversation.fptSessionId,
      visitorToken: conversation.fptVisitorToken,
    };
  }

  const configuredKey = process.env.FPT_CONNECTION_KEY;
  if (!configuredKey) throw new Error("FPT AI is not configured");

  const requestSession = (connectionKey: string) => {
    const body: Record<string, unknown> = { connectionKey, locale: "en" };
    if (conversation.fptVisitorToken) body.visitorToken = conversation.fptVisitorToken;
    return fetch(`${FPT_API_BASE}/visitor/session`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: FPT_ALLOWED_ORIGIN,
        referer: `${FPT_ALLOWED_ORIGIN}/dav-assistant/`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  };

  let response = await requestSession(configuredKey);
  if (response.status === 404 && configuredKey !== LEGACY_PUBLIC_CONNECTION_KEY) {
    response = await requestSession(LEGACY_PUBLIC_CONNECTION_KEY);
  }
  if (!response.ok) throw new Error(`FPT session request failed (${response.status})`);
  const data = await response.json();
  if (!data.sessionId || !data.visitorToken) throw new Error("FPT session response was incomplete");

  const db = await getDatabase();
  await db.collection("conversations").updateOne(
    { _id: conversation._id, visitorId: conversation.visitorId },
    {
      $set: {
        fptSessionId: data.sessionId,
        fptVisitorToken: data.visitorToken,
        fptExpiresAt: new Date(data.expiresAt || Date.now() + 30 * 60_000),
      },
    },
  );

  return { sessionId: data.sessionId as string, visitorToken: data.visitorToken as string };
}

export async function POST(request: Request) {
  const visitorId = await getVisitorId();
  const body = await request.json().catch(() => ({}));
  const content = safeText(body.message, 4000);

  if (!content || !ObjectId.isValid(body.conversationId)) {
    return Response.json({ error: "A valid conversation and message are required" }, { status: 400 });
  }

  const conversationId = new ObjectId(body.conversationId);
  const db = await getDatabase();
  const conversations = db.collection<ConversationDocument>("conversations");
  const messages = db.collection<MessageDocument>("messages");
  const conversation = await conversations.findOne({ _id: conversationId, visitorId });
  if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });

  const createdAt = new Date();
  const userDocument: MessageDocument = { _id: new ObjectId(), conversationId, visitorId, role: "user", content, createdAt };
  await messages.insertOne(userDocument);
  const title = conversation.title === "New conversation" ? content.slice(0, 64) : conversation.title;
  await conversations.updateOne({ _id: conversationId, visitorId }, { $set: { title, updatedAt: createdAt } });

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(frame({ type: "USER_MESSAGE", message: asMessage(userDocument) }));
      let assistantText = "";
      let upstreamMessageId: string | undefined;

      try {
        const session = await ensureFptSession(conversation);
        const upstream = await fetch(`${FPT_API_BASE}/runs`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${session.visitorToken}`,
            "content-type": "application/json",
            accept: "text/event-stream",
            origin: FPT_ALLOWED_ORIGIN,
            referer: `${FPT_ALLOWED_ORIGIN}/dav-assistant/`,
          },
          body: JSON.stringify({ sessionId: session.sessionId, input: content }),
          signal: request.signal,
        });

        if (!upstream.ok || !upstream.body) {
          throw new Error(`FPT chat request failed (${upstream.status})`);
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
          let cut = buffer.indexOf("\n\n");

          while (cut >= 0) {
            const chunk = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            const data = chunk
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart())
              .join("\n");

            if (data) {
              try {
                const event = JSON.parse(data) as FptEvent;
                if (event.type === "TEXT_MESSAGE_START") upstreamMessageId = event.messageId;
                if (event.type === "TEXT_MESSAGE_CONTENT" || event.type === "TEXT_MESSAGE_CHUNK") {
                  assistantText += event.delta || "";
                  upstreamMessageId ||= event.messageId;
                }
                controller.enqueue(frame(event));
              } catch {
                // Ignore malformed upstream frames while preserving the rest of the stream.
              }
            }
            cut = buffer.indexOf("\n\n");
          }
        }

        if (!assistantText.trim()) throw new Error("FPT AI returned an empty response");
        const assistantCreatedAt = new Date();
        const assistantDocument: MessageDocument = {
          _id: new ObjectId(),
          conversationId,
          visitorId,
          role: "assistant",
          content: assistantText,
          createdAt: assistantCreatedAt,
          upstreamMessageId,
        };
        await messages.insertOne(assistantDocument);
        await conversations.updateOne(
          { _id: conversationId, visitorId },
          { $set: { title, updatedAt: assistantCreatedAt } },
        );
        controller.enqueue(frame({ type: "DONE", message: asMessage(assistantDocument) }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "The assistant is temporarily unavailable";
        controller.enqueue(frame({ type: "RUN_ERROR", message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
