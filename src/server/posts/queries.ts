import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/server/db/supabase";

export const POST_LIST_FIELDS =
  "id, title, body, status, planned_on, scheduled_at, published_at, publish_error, campaign_id, channel_id, group_id, created_by, updated_at, channels(type, name), campaigns(name), post_assignees(user_id), comments(count)";

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

/** Alle sichtbaren Beiträge (RLS filtert für Externe automatisch). */
export async function listPosts(organizationId: string, opts: { from?: string; to?: string; statuses?: string[] } = {}) {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from("posts").select(POST_LIST_FIELDS).eq("organization_id", organizationId);
  if (opts.statuses?.length) q = q.in("status", opts.statuses as never);
  const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (isDate(opts.from) && isDate(opts.to)) {
    // Termin oder geplanter Tag im Zeitraum
    q = q.or(
      `and(scheduled_at.gte.${opts.from}T00:00:00Z,scheduled_at.lt.${opts.to}T23:59:59Z),and(scheduled_at.is.null,planned_on.gte.${opts.from},planned_on.lte.${opts.to})`,
    );
  }
  const { data, error } = await q
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("planned_on", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data ?? [];
}

export const getPost = cache(async (organizationId: string, id: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, organization_id, title, body, internal_notes, status, planned_on, scheduled_at, published_at, publish_error, campaign_id, channel_id, group_id, created_by, version, updated_at, created_at, channels(id, type, name), campaigns(id, name), post_assignees(user_id)",
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
});

export type PostDetail = NonNullable<Awaited<ReturnType<typeof getPost>>>;

export async function getPostThread(organizationId: string, postId: string) {
  const supabase = await createSupabaseServerClient();
  const [comments, approvals, prompts, activity] = await Promise.all([
    supabase
      .from("comments")
      .select("id, author_id, body, quoted_text, created_at, edited_at")
      .eq("organization_id", organizationId)
      .eq("post_id", postId)
      .order("created_at"),
    supabase
      .from("approvals")
      .select("id, decision, comment_id, decided_by, decided_at")
      .eq("organization_id", organizationId)
      .eq("post_id", postId)
      .order("decided_at"),
    supabase
      .from("post_ai_prompts")
      .select("id, kind, prompt, result, result_at, position")
      .eq("organization_id", organizationId)
      .eq("post_id", postId)
      .order("position"),
    supabase
      .from("activity_log")
      .select("id, entity_type, action, actor_id, changes, created_at")
      .eq("organization_id", organizationId)
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  for (const r of [comments, approvals, prompts, activity]) if (r.error) throw r.error;
  return {
    comments: comments.data ?? [],
    approvals: approvals.data ?? [],
    prompts: prompts.data ?? [],
    activity: activity.data ?? [],
  };
}

export type PostThread = Awaited<ReturnType<typeof getPostThread>>;

/** Beiträge derselben Idee (andere Kanäle) */
export async function listGroupSiblings(organizationId: string, groupId: string | null, postId: string) {
  if (!groupId) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, status, channels(type, name)")
    .eq("organization_id", organizationId)
    .eq("group_id", groupId)
    .neq("id", postId);
  if (error) throw error;
  return data ?? [];
}

export async function countPendingApprovals(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "in_review");
  return count ?? 0;
}

export async function countUnreadNotifications(organizationId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
