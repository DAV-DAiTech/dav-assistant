import { eosConfigured, isMock } from "@/lib/chatbot";
import { pingDb } from "@/lib/server/db";
import { api, json, preflight } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = preflight;

// Checks configuration and MongoDB only; it never calls the model, so it costs no tokens.
export const GET = api(async (_request, { requestId }) => {
  let mongo: "ok" | "error" = "ok";
  try {
    await pingDb();
  } catch (error) {
    mongo = "error";
    console.error("[health] mongo ping failed", { requestId, error: (error as Error)?.name });
  }
  const mock = isMock();
  const eos = eosConfigured() ? "configured" : "missing";
  const status = mongo === "ok" && (mock || eos === "configured") ? "ok" : "degraded";
  return json({ status, mongo, eos, mock });
});
