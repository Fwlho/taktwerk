import "server-only";
import { cache } from "react";
import type { ChannelType } from "@/lib/domain";
import { createSupabaseServerClient } from "@/server/db/supabase";

const CAMPAIGN_FIELDS =
  "id, name, goal, goal_description, goal_target, start_date, end_date, status, budget_planned_cents, created_at, posts(count), campaign_channels(channel_id, budget_planned_cents, channels(type))";

function mapCampaign<T extends { posts: { count: number }[]; campaign_channels: { channel_id: string; channels: { type: ChannelType } | null }[] }>(
  c: T,
) {
  const { posts, campaign_channels, ...rest } = c;
  return {
    ...rest,
    postCount: posts[0]?.count ?? 0,
    channelIds: campaign_channels.map((cc) => cc.channel_id),
    channelTypes: campaign_channels.flatMap((cc) => (cc.channels ? [cc.channels.type] : [])),
    // Ausgaben folgen mit Phase 4 (Budget)
    budgetSpentCents: 0,
  };
}

export const listCampaigns = cache(async (organizationId: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_FIELDS)
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCampaign);
});

export type CampaignListItem = Awaited<ReturnType<typeof listCampaigns>>[number];

export const getCampaign = cache(async (organizationId: string, id: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_FIELDS)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCampaign(data) : null;
});
