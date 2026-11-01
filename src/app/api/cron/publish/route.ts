import { timingSafeEqual } from "node:crypto";
import { runDuePublishing } from "@/server/publishing/service";

/** Für den späteren Online-Betrieb: Zeitplan ruft das jede Minute mit „Authorization: Bearer CRON_SECRET“ auf. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok = secret.length >= 32 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ published: await runDuePublishing() });
}
