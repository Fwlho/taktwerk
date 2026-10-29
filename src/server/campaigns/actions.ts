"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
