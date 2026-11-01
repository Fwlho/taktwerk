import { z } from "zod";
import { TEXT_MODES } from "@/lib/ai";
import { can } from "@/lib/permissions";
import { getOrgContext } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { AiError, toAiError } from "@/server/ai/client";
import { streamPostText } from "@/server/ai/service";

const bodySchema = z.object({
  postId: z.uuid(),
  mode: z.enum(TEXT_MODES),
  draft: z.string().max(70000),
  instruction: z.string().max(2000).optional(),
  sourcePostId: z.uuid().optional(),
});

/** KI-Text für den Beitragseditor als Text-Stream (wortweise Anzeige, „Stopp“ bricht ab). */
export async function POST(req: Request, ctx: RouteContext<"/o/[slug]/ai/text">) {
  const { slug } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "aiFailed" }, { status: 400 });

  const { organization, role } = await getOrgContext(slug);
  if (!can(role, "ai.use")) return Response.json({ error: "forbidden" }, { status: 403 });

  try {
    const db = await createSupabaseServerClient();
    const stream = await streamPostText({ db, organization }, parsed.data, req.signal);
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
    });
  } catch (e) {
    const err = e instanceof AiError ? e : toAiError(e);
    const status = err.key === "forbidden" ? 403 : err.key === "aiLimit" ? 429 : err.key === "aiNotConfigured" ? 503 : 500;
    return Response.json({ error: err.key }, { status });
  }
}
