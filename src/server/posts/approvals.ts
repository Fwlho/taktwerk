import "server-only";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { POST_LIST_FIELDS } from "./queries";

/** Offene Freigaben, dringendste (früheste Veröffentlichung) zuerst; mit letztem Kommentar und Anfragendem */
export async function listPendingApprovals(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_LIST_FIELDS)
    .eq("organization_id", organizationId)
    .eq("status", "in_review")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("planned_on", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: true });
  if (error) throw error;
  const posts = data ?? [];
  if (posts.length === 0) return [];

  const ids = posts.map((p) => p.id);
  const [comments, requests] = await Promise.all([
    supabase.from("comments").select("post_id, author_id, body, created_at").in("post_id", ids).order("created_at", { ascending: false }),
    supabase
      .from("activity_log")
      .select("post_id, actor_id, changes, created_at")
      .in("post_id", ids)
      .eq("entity_type", "posts")
      .order("created_at", { ascending: false }),
  ]);
  return posts.map((p) => ({
    ...p,
    lastComment: (comments.data ?? []).find((c) => c.post_id === p.id) ?? null,
    requestedBy:
      (requests.data ?? []).find(
        (a) => a.post_id === p.id && (a.changes as { status?: { to?: string } } | null)?.status?.to === "in_review",
      )?.actor_id ?? p.created_by,
  }));
}

export type PendingApproval = Awaited<ReturnType<typeof listPendingApprovals>>[number];
