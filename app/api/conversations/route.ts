import { getDatabase } from "@/lib/mongodb";
import { apiError, asConversation, getVisitorId, safeText } from "@/lib/server";
import type { ConversationDocument } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const visitorId = await getVisitorId();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 30, 1), 50);
    const cursor = searchParams.get("cursor");
    const query: { visitorId: string; updatedAt?: { $lt: Date } } = { visitorId };

    if (cursor) {
      const date = new Date(cursor);
      if (!Number.isNaN(date.valueOf())) query.updatedAt = { $lt: date };
    }

    const db = await getDatabase();
    const conversations = await db
      .collection<ConversationDocument>("conversations")
      .find(query)
      .sort({ updatedAt: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = conversations.length > limit;
    const page = conversations.slice(0, limit);
    return Response.json({
      conversations: page.map(asConversation),
      nextCursor: hasMore ? page.at(-1)?.updatedAt.toISOString() : null,
    });
  } catch {
    return apiError("Unable to load conversations", 500);
  }
}

export async function POST(request: Request) {
  try {
    const visitorId = await getVisitorId();
    const body = await request.json().catch(() => ({}));
    const title = safeText(body.title, 80) || "New conversation";
    const now = new Date();
    const document = { visitorId, title, createdAt: now, updatedAt: now };
    const db = await getDatabase();
    const result = await db.collection("conversations").insertOne(document);
    return Response.json(asConversation({ ...document, _id: result.insertedId }), { status: 201 });
  } catch {
    return apiError("Unable to create conversation", 500);
  }
}
