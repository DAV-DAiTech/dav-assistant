import { ObjectId } from "mongodb";
import { collections } from "@/lib/server/db";
import { ApiError, api, json, preflight } from "@/lib/server/http";
import { toConversation, toMessage } from "@/lib/server/serialize";
import { objectIdString, patchBody, readJson } from "@/lib/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

type Params = { params: Promise<{ id: string }> };

async function parseId(params: Params["params"]) {
  const parsed = objectIdString.safeParse((await params).id);
  if (!parsed.success) throw new ApiError("not_found", 404);
  return new ObjectId(parsed.data);
}

export const GET = api<Params>(async (_request, { clientId }, { params }) => {
  const _id = await parseId(params);
  const { conversations, messages } = await collections();
  const conversation = await conversations.findOne({ _id, clientId });
  if (!conversation) throw new ApiError("not_found", 404);
  const list = await messages
    .find({ conversationId: _id, clientId })
    .sort({ createdAt: 1, _id: 1 })
    .limit(500)
    .toArray();
  return json({ ...toConversation(conversation), messages: list.map(toMessage) });
});

export const PATCH = api<Params>(async (request, { clientId }, { params }) => {
  const _id = await parseId(params);
  const changes = patchBody.parse(await readJson(request));
  const { conversations } = await collections();
  const updated = await conversations.findOneAndUpdate(
    { _id, clientId },
    { $set: changes },
    { returnDocument: "after" },
  );
  if (!updated) throw new ApiError("not_found", 404);
  return json(toConversation(updated));
});

export const DELETE = api<Params>(async (_request, { clientId }, { params }) => {
  const _id = await parseId(params);
  const { conversations, messages } = await collections();
  const { deletedCount } = await conversations.deleteOne({ _id, clientId });
  if (!deletedCount) throw new ApiError("not_found", 404);
  await messages.deleteMany({ conversationId: _id, clientId });
  return json({ ok: true });
});
