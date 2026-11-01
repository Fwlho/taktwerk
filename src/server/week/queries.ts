import "server-only";
import { weekDays } from "@/lib/calendar";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { listPosts } from "@/server/posts/queries";

/** Beiträge einer Woche plus Prompt-Anzahl und offene Sammel-Freigaben */
export async function getWeekData(organizationId: string, weekStart: string) {
  const days = weekDays(weekStart);
  const supabase = await createSupabaseServerClient();
  const posts = await listPosts(organizationId, { from: days[0]!, to: days[6]! });
  const ids = posts.map((p) => p.id);
  const [prompts, requests] = await Promise.all([
    ids.length
      ? supabase.from("post_ai_prompts").select("post_id").in("post_id", ids)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    supabase
      .from("approval_requests")
      .select("id, requested_by, channel_id, message, created_at, approval_request_posts(post_id)")
      .eq("organization_id", organizationId)
      .eq("week_start", days[0]!)
      .eq("status", "open")
      .order("created_at", { ascending: false }),
  ]);
  const promptCount = new Map<string, number>();
  for (const p of prompts.data ?? []) promptCount.set(p.post_id, (promptCount.get(p.post_id) ?? 0) + 1);

  return {
    days,
    posts: posts.map((p) => ({ ...p, promptCount: promptCount.get(p.id) ?? 0 })),
    requests: (requests.data ?? []).map(({ approval_request_posts, ...r }) => ({ ...r, postIds: approval_request_posts.map((x) => x.post_id) })),
  };
}

export type WeekData = Awaited<ReturnType<typeof getWeekData>>;
export type WeekPost = WeekData["posts"][number];
