import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { apiError, asMessage, getVisitorId, safeText } from "@/lib/server";
import type { MessageRole } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const visitorId = await getVisitorId();
    const body = await request.json().catch(() => ({}));
    const content = safeText(body.content, 12000);
    const role: MessageRole = body.role === "assistant" ? "assistant" : "user";
    if (!content || !ObjectId.isValid(body.conversationId)) return apiError("Invalid message");

    const conversationId = new ObjectId(body.conversationId);
    const db = await getDatabase();
    const exists = await db.collection("conversations").findOne({ _id: conversationId, visitorId });
    if (!exists) return apiError("Conversation not found", 404);

    const createdAt = new Date();
    const document = { conversationId, visitorId, role, content, createdAt };
    const result = await db.collection("messages").insertOne(document);
    await db.collection("conversations").updateOne({ _id: conversationId }, { $set: { updatedAt: createdAt } });
    return Response.json(asMessage({ ...document, _id: result.insertedId }), { status: 201 });
  } catch {
    return apiError("Unable to save message", 500);
  }
}
