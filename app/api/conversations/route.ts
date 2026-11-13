import { ObjectId, type Filter } from "mongodb";
import { collections, type ConversationDoc } from "@/lib/server/db";
import { ApiError, api, json, preflight } from "@/lib/server/http";
import { toConversation } from "@/lib/server/serialize";
import { cursorSchema, escapeRegex, listQuery } from "@/lib/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

function decodeCursor(raw: string) {
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
  } catch {
    throw new ApiError("invalid_input", 400);
  }
}

function encodeCursor(c: ConversationDoc) {
  return Buffer.from(
    JSON.stringify({ p: c.pinned, u: c.updatedAt.getTime(), i: c._id.toHexString() }),
  ).toString("base64url");
}

export const GET = api(async (request, { clientId }) => {
  const url = new URL(request.url);
  const query = listQuery.parse(Object.fromEntries(url.searchParams));
  const filter: Filter<ConversationDoc> = { clientId };
  if (query.q) filter.title = { $regex: escapeRegex(query.q), $options: "i" };
  if (query.cursor) {
    const { p, u, i } = decodeCursor(query.cursor);
    const at = new Date(u);
    const id = new ObjectId(i);
    filter.$or = [
      ...(p ? [{ pinned: false }] : []),
      { pinned: p, updatedAt: { $lt: at } },
      { pinned: p, updatedAt: at, _id: { $lt: id } },
    ];
  }
  const { conversations } = await collections();
  const docs = await conversations
    .find(filter)
    .sort({ pinned: -1, updatedAt: -1, _id: -1 })
    .limit(query.limit + 1)
    .toArray();
  const page = docs.slice(0, query.limit);
  return json({
    items: page.map(toConversation),
    nextCursor: docs.length > query.limit ? encodeCursor(page[page.length - 1]) : null,
  });
});

export const DELETE = api(async (_request, { clientId }) => {
  const { conversations, messages } = await collections();
  await messages.deleteMany({ clientId });
  const { deletedCount } = await conversations.deleteMany({ clientId });
  return json({ deleted: deletedCount });
});
