import "server-only";
import { createSupabaseServerClient } from "@/server/db/supabase";

export const POST_LIST_FIELDS =
  "id, title, body, status, planned_on, scheduled_at, published_at, publish_error, campaign_id, channel_id, created_by, updated_at, channels(type, name), campaigns(name), post_assignees(user_id), comments(count)";

export async function listPostsForCampaign(organizationId: string, campaignId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_LIST_FIELDS)
    .eq("organization_id", organizationId)
    .eq("campaign_id", campaignId)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("planned_on", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export type PostListRow = Awaited<ReturnType<typeof listPostsForCampaign>>[number];
