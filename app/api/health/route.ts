import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });
    const configured = Boolean(process.env.FPT_CONNECTION_KEY);
    return Response.json({ status: configured ? "online" : "offline" }, { status: configured ? 200 : 503 });
  } catch {
    return Response.json({ status: "offline" }, { status: 503 });
  }
}
