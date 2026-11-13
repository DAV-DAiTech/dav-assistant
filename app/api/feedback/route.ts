import { ObjectId } from "mongodb";
import { collections } from "@/lib/server/db";
import { ApiError, api, json, preflight } from "@/lib/server/http";
import { feedbackBody, readJson } from "@/lib/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

export const POST = api(async (request, { clientId }) => {
  const { messageId, value } = feedbackBody.parse(await readJson(request));
  const { messages } = await collections();
  const { matchedCount } = await messages.updateOne(
    { _id: new ObjectId(messageId), clientId, role: "assistant" },
    { $set: { feedback: value } },
  );
  if (!matchedCount) throw new ApiError("not_found", 404);
  return json({ ok: true, value });
});
