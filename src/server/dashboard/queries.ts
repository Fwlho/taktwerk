import "server-only";
import { weekDays } from "@/lib/calendar";
import { todayBerlin } from "@/lib/format";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { listPosts } from "@/server/posts/queries";

/** Alles für die Startseite in einem Rutsch (parallel geladen). */
export async function getDashboardData(organizationId: string) {
  const today = todayBerlin();
  const days = weekDays(today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const supabase = await createSupabaseServerClient();

  const [weekPosts, pending, campaigns, publishedThisMonth, activity] = await Promise.all([
    listPosts(organizationId, { from: days[0]!, to: days[6]! }),
    supabase
      .from("posts")
      .select("id, title, scheduled_at, planned_on")
      .eq("organization_id", organizationId)
      .eq("status", "in_review")
      .order("scheduled_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("campaigns")
      .select("id, name, goal, goal_target, end_date, budget_planned_cents, posts(count)")
      .eq("organization_id", organizationId)
      .eq("status", "running")
      .order("end_date", { ascending: true, nullsFirst: false })
      .limit(4),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["published", "evaluated"])
      .gte("published_at", `${monthStart}T00:00:00Z`),
    supabase
      .from("activity_log")
      .select("id, entity_type, action, actor_id, changes, created_at, post_id")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const activityRows = activity.data ?? [];
  const postIds = [...new Set(activityRows.map((a) => a.post_id).filter((id): id is string => !!id))];
  const { data: titles } = postIds.length
    ? await supabase.from("posts").select("id, title").in("id", postIds)
    : { data: [] as { id: string; title: string }[] };

  return {
    today,
    days,
    weekPosts,
    pending: pending.data ?? [],
    campaigns: (campaigns.data ?? []).map(({ posts, ...c }) => ({ ...c, postCount: posts[0]?.count ?? 0 })),
    publishedThisMonth: publishedThisMonth.count ?? 0,
    activity: activityRows,
    postTitles: Object.fromEntries((titles ?? []).map((p) => [p.id, p.title])),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
