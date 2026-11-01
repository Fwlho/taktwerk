"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { CAMPAIGN_GOALS, CHANNEL_TYPES } from "@/lib/domain";
import { can } from "@/lib/permissions";
import { campaignSchema, type CampaignFormValues } from "@/lib/validation";
import { requirePermission } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { dbError, guard, type ActionResult } from "@/server/action-result";

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function syncChannels(supabase: Supabase, organizationId: string, campaignId: string, channelIds: string[]) {
  const { data: current, error } = await supabase.from("campaign_channels").select("channel_id").eq("campaign_id", campaignId);
  if (error) return error;
  const have = new Set((current ?? []).map((c) => c.channel_id));
  const want = new Set(channelIds);
  const toDelete = [...have].filter((id) => !want.has(id));
  const toInsert = [...want].filter((id) => !have.has(id));
  if (toDelete.length) {
    const { error: e } = await supabase.from("campaign_channels").delete().eq("campaign_id", campaignId).in("channel_id", toDelete);
    if (e) return e;
  }
  if (toInsert.length) {
    const { error: e } = await supabase
      .from("campaign_channels")
      .insert(toInsert.map((channel_id) => ({ campaign_id: campaignId, channel_id, organization_id: organizationId })));
    if (e) return e;
  }
  return null;
}

export async function createCampaign(slug: string, input: CampaignFormValues): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const parsed = campaignSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "campaigns.create");
    const v = parsed.data;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        organization_id: organization.id,
        name: v.name,
        goal: v.goal,
        goal_description: v.goalDescription,
        goal_target: v.goalTarget,
        start_date: v.startDate,
        end_date: v.endDate,
        status: v.status,
        budget_planned_cents: v.budget,
      })
      .select("id")
      .single();
    if (error) return { error: dbError(error) };
    const channelError = await syncChannels(supabase, organization.id, data.id, v.channelIds);
    if (channelError) return { error: dbError(channelError) };
    revalidatePath(`/o/${slug}/campaigns`);
    return { ok: true, data: { id: data.id } };
  });
}

export async function updateCampaign(slug: string, id: string, input: CampaignFormValues): Promise<ActionResult> {
  return guard(async () => {
    const parsed = campaignSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "campaigns.update");
    const v = parsed.data;
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("campaigns")
      .update(
        {
          name: v.name,
          goal: v.goal,
          goal_description: v.goalDescription,
          goal_target: v.goalTarget,
          start_date: v.startDate,
          end_date: v.endDate,
          status: v.status,
          budget_planned_cents: v.budget,
        },
        { count: "exact" },
      )
      .eq("id", id)
      .eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    if (!count) return { error: "gone" };
    const channelError = await syncChannels(supabase, organization.id, id, v.channelIds);
    if (channelError) return { error: dbError(channelError) };
    revalidatePath(`/o/${slug}/campaigns`, "layout");
    return { ok: true };
  });
}

export async function deleteCampaign(slug: string, id: string): Promise<ActionResult> {
  return guard(async () => {
    const { organization } = await requirePermission(slug, "campaigns.delete");
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("campaigns")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    if (!count) return { error: "gone" };
    revalidatePath(`/o/${slug}/campaigns`);
    redirect(`/o/${slug}/campaigns`);
  });
}

const planSchema = z.object({
  name: z.string().trim().min(1).max(120),
  goal: z.enum(CAMPAIGN_GOALS),
  goalDescription: z.string().max(500),
  durationWeeks: z.number().int().min(1).max(12),
  channels: z.array(z.enum(CHANNEL_TYPES)).max(6),
  ideas: z
    .array(z.object({ title: z.string().trim().min(1).max(200), body: z.string().max(5000), channel: z.enum(CHANNEL_TYPES), week: z.number().int().min(1).max(12) }))
    .max(10),
});
export type CampaignPlanInput = z.infer<typeof planSchema>;

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Kampagnenvorschlag übernehmen: Kampagne + Kanäle + Beitragsideen.
 * Fehlende Kanäle legt nur der Inhaber an; sonst wird ein vorhandener Kanal verwendet.
 */
export async function applyCampaignPlan(slug: string, input: CampaignPlanInput, startDate: string): Promise<ActionResult<{ id: string; posts: number }>> {
  return guard(async () => {
    const parsed = planSchema.safeParse(input);
    const start = z.iso.date().safeParse(startDate);
    if (!parsed.success || !start.success) return { error: "invalid" };
    const plan = parsed.data;
    const { organization, role } = await requirePermission(slug, "campaigns.create");
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase.from("channels").select("id, type").eq("organization_id", organization.id);
    const byType = new Map((existing ?? []).map((c) => [c.type, c.id]));
    const wanted = [...new Set([...plan.channels, ...plan.ideas.map((i) => i.channel)])];
    const missing = wanted.filter((t) => !byType.has(t));
    if (missing.length && can(role, "channels.manage")) {
      const tc = await getTranslations("channels.types");
      const { data: created } = await supabase
        .from("channels")
        .insert(missing.map((type) => ({ organization_id: organization.id, type, name: tc(type) })))
        .select("id, type");
      for (const c of created ?? []) byType.set(c.type, c.id);
    }
    const fallbackChannel = [...byType.values()][0];

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({
        organization_id: organization.id,
        name: plan.name,
        goal: plan.goal,
        goal_description: plan.goalDescription || null,
        start_date: start.data,
        end_date: addDays(start.data, plan.durationWeeks * 7 - 1),
        status: "draft",
      })
      .select("id")
      .single();
    if (error) return { error: dbError(error) };

    const channelIds = [...new Set(plan.channels.flatMap((t) => (byType.get(t) ? [byType.get(t)!] : [])))];
    const channelError = await syncChannels(supabase, organization.id, campaign.id, channelIds);
    if (channelError) return { error: dbError(channelError) };

    // Ideen innerhalb ihrer Woche verteilen (Di, Do, Sa …)
    const perWeek = new Map<number, number>();
    const rows = plan.ideas.flatMap((idea) => {
      const channelId = byType.get(idea.channel) ?? fallbackChannel;
      if (!channelId) return [];
      const n = perWeek.get(idea.week) ?? 0;
      perWeek.set(idea.week, n + 1);
      return [
        {
          organization_id: organization.id,
          channel_id: channelId,
          campaign_id: campaign.id,
          title: idea.title,
          body: idea.body,
          planned_on: addDays(start.data, (idea.week - 1) * 7 + Math.min(6, 1 + n * 2)),
          status: "idea" as const,
        },
      ];
    });
    if (rows.length) {
      const { error: pErr } = await supabase.from("posts").insert(rows);
      if (pErr) return { error: dbError(pErr) };
    }
    revalidatePath(`/o/${slug}`, "layout");
    return { ok: true, data: { id: campaign.id, posts: rows.length } };
  });
}
