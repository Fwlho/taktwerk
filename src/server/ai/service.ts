import "server-only";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { CHANNEL_TYPES, type CampaignGoal, type ChannelType } from "@/lib/domain";
import type { TextMode } from "@/lib/ai";
import { aiConfigured, AiError } from "./client";
import { generateJson, generateText, streamText } from "./generate";
import {
  buildCampaignTask,
  buildIdeasTask,
  buildPromptRun,
  buildSystemPrompt,
  buildTextTask,
  type BrandProfile,
  type CampaignTemplate,
} from "./prompts";
import { campaignSchema, normalizePlan, type CampaignPlan } from "./plan";
import type { Db } from "./usage";

export type { CampaignPlan };

export type AiContext = { db: Db; organization: { id: string; name: string } };

/** Unternehmensprofil in lesbarer Form (Beschriftungen aus messages/de.json) */
async function loadBrand({ db, organization }: AiContext): Promise<BrandProfile> {
  const t = await getTranslations("profile");
  const { data: p } = await db.from("organization_profiles").select("*").eq("organization_id", organization.id).maybeSingle();
  return {
    name: organization.name,
    industry: p?.industry ? t(`industries.${p.industry}` as never) : null,
    location: p?.location ?? null,
    radiusKm: p?.radius_km ?? null,
    website: p?.website ?? null,
    audiences: (p?.target_audiences ?? []).map((a) => t(`audienceOptions.${a}` as never)),
    services: p?.services ?? [],
    addressForm: p?.address_form === "sie" ? "sie" : "du",
    tone: p?.tone ?? null,
  };
}

async function loadPost(ctx: AiContext, postId: string) {
  const { data } = await ctx.db
    .from("posts")
    .select("id, title, body, internal_notes, status, channels(type)")
    .eq("id", postId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  // RLS: nicht sichtbare Beiträge (z. B. Extern ohne Zuweisung) liefern nichts
  if (!data?.channels) throw new AiError("forbidden");
  if (data.status === "published" || data.status === "evaluated") throw new AiError("forbidden");
  return { ...data, channel: data.channels.type as ChannelType };
}

const fakeLine = (what: string, title: string) => `Testvorschlag (${what}) zu „${title || "Beitrag"}“: Kurz, freundlich und mit klarer Einladung, sich zu melden.`;

// ---------------------------------------------------------------------------
// Texte im Beitragseditor (Streaming)
// ---------------------------------------------------------------------------
export async function streamPostText(
  ctx: AiContext,
  input: { postId: string; mode: TextMode; draft: string; instruction?: string; sourcePostId?: string },
  signal: AbortSignal,
) {
  const post = await loadPost(ctx, input.postId);
  let source: { channel: ChannelType; text: string } | undefined;
  if (input.mode === "adapt") {
    if (!input.sourcePostId) throw new AiError("aiFailed");
    const src = await loadPost(ctx, input.sourcePostId).catch(() => null);
    if (!src?.body.trim()) throw new AiError("aiFailed");
    source = { channel: src.channel, text: src.body };
  }
  const brand = await loadBrand(ctx);
  return streamText(
    {
      db: ctx.db,
      organizationId: ctx.organization.id,
      kind: input.mode === "adapt" ? "adapt" : "text",
      system: buildSystemPrompt(brand),
      user: buildTextTask({
        mode: input.mode,
        channel: post.channel,
        title: post.title,
        notes: post.internal_notes ?? "",
        draft: input.draft,
        instruction: input.instruction,
        source,
      }),
    },
    signal,
    () => fakeLine(input.mode, post.title),
  );
}

// ---------------------------------------------------------------------------
// Gespeicherte Prompts ausführen (Text/Caption)
// ---------------------------------------------------------------------------
export async function runPostPrompt(ctx: AiContext, promptId: string): Promise<{ result: string; resultAt: string }> {
  const { data: prompt } = await ctx.db
    .from("post_ai_prompts")
    .select("id, kind, prompt, post_id")
    .eq("id", promptId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!prompt) throw new AiError("forbidden");
  if (prompt.kind !== "text" && prompt.kind !== "caption") throw new AiError("aiFailed");
  if (!prompt.prompt.trim()) throw new AiError("aiFailed");
  const post = await loadPost(ctx, prompt.post_id);
  const brand = await loadBrand(ctx);
  const result = await generateText(
    {
      db: ctx.db,
      organizationId: ctx.organization.id,
      kind: "prompt",
      system: buildSystemPrompt(brand),
      user: buildPromptRun({ kind: prompt.kind, prompt: prompt.prompt, channel: post.channel, title: post.title, body: post.body }),
    },
    () => fakeLine(prompt.kind, post.title),
  );
  const resultAt = new Date().toISOString();
  const { error } = await ctx.db.from("post_ai_prompts").update({ result, result_at: resultAt }).eq("id", prompt.id);
  if (error) throw new AiError("forbidden");
  return { result, resultAt };
}

// ---------------------------------------------------------------------------
// Kanalanpassung beim Übertragen (mehrere Kanäle parallel)
// ---------------------------------------------------------------------------
export async function adaptPostsFrom(ctx: AiContext, sourceId: string, targetIds: string[]): Promise<{ adapted: number; failed: number }> {
  const source = await loadPost(ctx, sourceId);
  if (!source.body.trim()) return { adapted: 0, failed: 0 };
  const brand = await loadBrand(ctx);
  const system = buildSystemPrompt(brand);
  const results = await Promise.allSettled(
    targetIds.map(async (id) => {
      const target = await loadPost(ctx, id);
      const text = await generateText(
        {
          db: ctx.db,
          organizationId: ctx.organization.id,
          kind: "adapt",
          system,
          user: buildTextTask({
            mode: "adapt",
            channel: target.channel,
            title: target.title,
            notes: target.internal_notes ?? "",
            draft: target.body,
            source: { channel: source.channel, text: source.body },
          }),
        },
        () => fakeLine("adapt", target.title),
      );
      const { error } = await ctx.db.from("posts").update({ body: text }).eq("id", id);
      if (error) throw new AiError("aiFailed");
    }),
  );
  const failed = results.filter((r) => r.status === "rejected");
  // Tageslimit bei allen erreicht → als Fehler melden
  if (failed.length === results.length && failed[0]?.status === "rejected" && failed[0].reason instanceof AiError) throw failed[0].reason;
  return { adapted: results.length - failed.length, failed: failed.length };
}

// ---------------------------------------------------------------------------
// Ideen
// ---------------------------------------------------------------------------
const ideasSchema = z.object({ ideas: z.array(z.object({ title: z.string(), body: z.string() })) });
export type Idea = { title: string; body: string };

export async function suggestIdeas(ctx: AiContext, input: { channelId: string | null; topic?: string; count: number }): Promise<Idea[]> {
  let channel: ChannelType | null = null;
  if (input.channelId) {
    const { data } = await ctx.db.from("channels").select("type").eq("id", input.channelId).eq("organization_id", ctx.organization.id).maybeSingle();
    channel = (data?.type as ChannelType | undefined) ?? null;
  }
  const { data: recent } = await ctx.db
    .from("posts")
    .select("title")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const month = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date());
  const brand = await loadBrand(ctx);
  const out = await generateJson(
    {
      db: ctx.db,
      organizationId: ctx.organization.id,
      kind: "ideas",
      system: buildSystemPrompt(brand),
      user: buildIdeasTask({ channel, count: input.count, topic: input.topic, existingTitles: (recent ?? []).map((r) => r.title), month }),
    },
    ideasSchema,
    () => ({
      ideas: Array.from({ length: input.count }, (_, i) => ({ title: `Testidee ${i + 1}`, body: "Kurzer Einblick in den Arbeitsalltag." })),
    }),
  );
  return out.ideas
    .filter((i) => i.title.trim())
    .slice(0, input.count)
    .map((i) => ({ title: i.title.trim().slice(0, 120), body: i.body.trim().slice(0, 2000) }));
}

// ---------------------------------------------------------------------------
// Kampagnenvorschlag aus Branchenvorlage
// ---------------------------------------------------------------------------
export async function suggestCampaign(
  ctx: AiContext & { offline?: boolean },
  input: { goal: CampaignGoal; topic?: string; startDate: string }): Promise<CampaignPlan> {
  const [{ data: profile }, { data: channelRows }] = await Promise.all([
    ctx.db.from("organization_profiles").select("industry").eq("organization_id", ctx.organization.id).maybeSingle(),
    ctx.db.from("channels").select("type").eq("organization_id", ctx.organization.id),
  ]);
  const available = (channelRows ?? []).map((c) => c.type as ChannelType);
  const { data: templates } = await ctx.db
    .from("industry_templates")
    .select("industry, name, content")
    .eq("goal", input.goal)
    .in("industry", [profile?.industry ?? "other", "other"]);
  const row = templates?.find((x) => x.industry === profile?.industry) ?? templates?.find((x) => x.industry === "other");
  const template = row ? ({ name: row.name, ...(row.content as object) } as CampaignTemplate) : null;

  const fromTemplate = (): z.infer<typeof campaignSchema> => {
    const channels = (template?.channels ?? ["instagram"]).filter((c): c is ChannelType => (CHANNEL_TYPES as readonly string[]).includes(c));
    const weeks = template?.duration_weeks ?? 4;
    return {
      name: template?.name ?? "Kampagne",
      goal_description: template?.description ?? "",
      duration_weeks: weeks,
      channels,
      ideas: (template?.ideas ?? []).map((idea, i) => ({
        ...idea,
        channel: channels[i % Math.max(channels.length, 1)] ?? "instagram",
        week: Math.min(weeks, 1 + Math.floor((i * weeks) / 4)),
      })),
    };
  };

  // Ohne KI: Branchenvorlage direkt verwenden (kostenlos)
  if (ctx.offline || !aiConfigured()) return normalizePlan(fromTemplate(), input.goal, available, "template");

  const tg = await getTranslations("campaigns.goals");
  const brand = await loadBrand(ctx);
  const raw = await generateJson(
    {
      db: ctx.db,
      organizationId: ctx.organization.id,
      kind: "campaign",
      system: buildSystemPrompt(brand),
      user: buildCampaignTask({ goal: tg(input.goal), topic: input.topic, template, channels: available, startDate: input.startDate }),
    },
    campaignSchema,
    fromTemplate,
  );
  return normalizePlan(raw, input.goal, available, "ai");
}
