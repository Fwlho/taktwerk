"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AiErrorKey } from "@/lib/ai";
import { CAMPAIGN_GOALS } from "@/lib/domain";
import { todayBerlin } from "@/lib/format";
import { can } from "@/lib/permissions";
import { getOrgContext, requirePermission } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { guard, type ActionResult } from "@/server/action-result";
import { applyCampaignPlan } from "@/server/campaigns/actions";
import { aiConfigured, toAiError } from "./client";
import { adaptPostsFrom, runPostPrompt, suggestCampaign, suggestIdeas, type CampaignPlan, type Idea } from "./service";
import { aiUsageToday } from "./usage";

/** Fehler der KI-Schicht in Fehlerschlüssel (messages: ai.errors.*) übersetzen */
async function aiGuard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  return guard(async () => {
    try {
      return await fn();
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e) throw e; // notFound/redirect durchreichen
      return { error: toAiError(e).key satisfies AiErrorKey };
    }
  });
}

async function context(slug: string) {
  const ctx = await getOrgContext(slug);
  return { ...ctx, ai: { db: await createSupabaseServerClient(), organization: ctx.organization } };
}

export type AiStatus = { configured: boolean; used: number; limit: number; allowed: boolean };

/** Ist KI eingerichtet, darf die Person sie nutzen, wie viel ist heute noch frei? */
export async function getAiStatus(slug: string): Promise<AiStatus> {
  const { role, ai } = await context(slug);
  const usage = await aiUsageToday(ai.db, ai.organization.id);
  return { configured: aiConfigured(), allowed: can(role, "ai.use"), ...usage };
}

export async function runPrompt(slug: string, promptId: string): Promise<ActionResult<{ result: string; resultAt: string }>> {
  return aiGuard(async () => {
    if (!z.uuid().safeParse(promptId).success) return { error: "invalid" };
    const { ai } = await context(slug);
    await requirePermission(slug, "ai.use");
    return { ok: true, data: await runPostPrompt(ai, promptId) };
  });
}

/** Nach „Übertragen“: Texte der neuen Kanäle per KI anpassen */
export async function adaptTransferred(slug: string, sourceId: string, targetIds: string[]): Promise<ActionResult<{ adapted: number; failed: number }>> {
  return aiGuard(async () => {
    const ids = z.array(z.uuid()).min(1).max(6).safeParse(targetIds);
    if (!ids.success || !z.uuid().safeParse(sourceId).success) return { error: "invalid" };
    await requirePermission(slug, "ai.use");
    const { ai } = await context(slug);
    const res = await adaptPostsFrom(ai, sourceId, ids.data);
    revalidatePath(`/o/${slug}`, "layout");
    return { ok: true, data: res };
  });
}

const ideasSchema = z.object({ channelId: z.uuid().nullable(), topic: z.string().max(500).optional(), count: z.number().int().min(1).max(8) });

export async function suggestPostIdeas(slug: string, input: z.input<typeof ideasSchema>): Promise<ActionResult<{ ideas: Idea[] }>> {
  return aiGuard(async () => {
    const parsed = ideasSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    await requirePermission(slug, "posts.create");
    const { ai } = await context(slug);
    return { ok: true, data: { ideas: await suggestIdeas(ai, parsed.data) } };
  });
}

const campaignInput = z.object({ goal: z.enum(CAMPAIGN_GOALS), topic: z.string().max(500).optional() });

export async function suggestCampaignPlan(slug: string, input: z.input<typeof campaignInput>): Promise<ActionResult<{ plan: CampaignPlan; startDate: string }>> {
  return aiGuard(async () => {
    const parsed = campaignInput.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    await requirePermission(slug, "campaigns.create");
    const { ai } = await context(slug);
    const startDate = todayBerlin();
    return { ok: true, data: { plan: await suggestCampaign(ai, { ...parsed.data, startDate }), startDate } };
  });
}

/**
 * Onboarding Schritt 3: erstes Ziel → Kampagne mit 4 Ideen anlegen.
 * Ohne KI oder bei KI-Fehler wird die Branchenvorlage übernommen, damit der Einstieg nie scheitert.
 */
export async function startWithGoal(slug: string, goal: string): Promise<ActionResult<{ id: string; posts: number; source: CampaignPlan["source"] }>> {
  return aiGuard(async () => {
    const parsed = z.enum(CAMPAIGN_GOALS).safeParse(goal);
    if (!parsed.success) return { error: "invalid" };
    await requirePermission(slug, "campaigns.create");
    const { ai } = await context(slug);
    const startDate = todayBerlin();
    let plan: CampaignPlan;
    try {
      plan = await suggestCampaign(ai, { goal: parsed.data, startDate });
    } catch {
      plan = await suggestCampaign({ ...ai, offline: true }, { goal: parsed.data, startDate });
    }
    const res = await applyCampaignPlan(slug, plan, startDate);
    if (res.error || !res.data) return { error: res.error ?? "generic" };
    return { ok: true, data: { ...res.data, source: plan.source } };
  });
}
