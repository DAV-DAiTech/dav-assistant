import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { apiError, asConversation, asMessage, getVisitorId, safeText } from "@/lib/server";
import type { ConversationDocument, MessageDocument } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function asId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const visitorId = await getVisitorId();
    const { id } = await context.params;
    const objectId = asId(id);
    if (!objectId) return apiError("Conversation not found", 404);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 100, 1), 100);
    const cursor = searchParams.get("cursor");
    const db = await getDatabase();
    const conversation = await db.collection<ConversationDocument>("conversations").findOne({ _id: objectId, visitorId });
    if (!conversation) return apiError("Conversation not found", 404);

    const messageQuery: { conversationId: ObjectId; visitorId: string; createdAt?: { $lt: Date } } = {
      conversationId: objectId,
      visitorId,
    };
    if (cursor) {
      const date = new Date(cursor);
      if (!Number.isNaN(date.valueOf())) messageQuery.createdAt = { $lt: date };
    }

    const messages = await db
      .collection<MessageDocument>("messages")
      .find(messageQuery)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .toArray();
    const hasMore = messages.length > limit;
    const page = messages.slice(0, limit);
    const nextCursor = hasMore ? page.at(-1)?.createdAt.toISOString() : null;

    return Response.json({
      conversation: asConversation(conversation),
      messages: page.reverse().map(asMessage),
      nextCursor,
    });
  } catch {
    return apiError("Unable to load conversation", 500);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const visitorId = await getVisitorId();
    const { id } = await context.params;
    const objectId = asId(id);
    if (!objectId) return apiError("Conversation not found", 404);
    const body = await request.json().catch(() => ({}));
    const title = safeText(body.title, 80);
    if (!title) return apiError("A title is required");

    const db = await getDatabase();
    const conversation = await db.collection<ConversationDocument>("conversations").findOneAndUpdate(
      { _id: objectId, visitorId },
      { $set: { title, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!conversation) return apiError("Conversation not found", 404);
    return Response.json(asConversation(conversation));
  } catch {
    return apiError("Unable to rename conversation", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const visitorId = await getVisitorId();
    const { id } = await context.params;
    const objectId = asId(id);
    if (!objectId) return apiError("Conversation not found", 404);
    const db = await getDatabase();
    const result = await db.collection("conversations").deleteOne({ _id: objectId, visitorId });
    if (!result.deletedCount) return apiError("Conversation not found", 404);
    await db.collection("messages").deleteMany({ conversationId: objectId, visitorId });
    return new Response(null, { status: 204 });
  } catch {
    return apiError("Unable to delete conversation", 500);
  }
}
