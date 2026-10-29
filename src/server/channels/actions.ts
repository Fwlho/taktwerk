"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CHANNEL_TYPES } from "@/lib/domain";
import { requirePermission } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { dbError, guard, type ActionResult } from "@/server/action-result";

const addSchema = z.object({ type: z.enum(CHANNEL_TYPES), name: z.string().trim().min(1).max(80) });

export async function addChannel(slug: string, input: { type: string; name: string }): Promise<ActionResult> {
  return guard(async () => {
    const parsed = addSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "channels.manage");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("channels").insert({ organization_id: organization.id, ...parsed.data });
    if (error) return { error: dbError(error) };
    revalidatePath(`/o/${slug}`, "layout");
    return { ok: true };
  });
}

export async function removeChannel(slug: string, channelId: string): Promise<ActionResult> {
  return guard(async () => {
    const { organization } = await requirePermission(slug, "channels.manage");
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id)
      .eq("channel_id", channelId);
    if (count) return { error: "channelHasPosts" };
    const { error } = await supabase.from("channels").delete().eq("id", channelId).eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    revalidatePath(`/o/${slug}`, "layout");
    return { ok: true };
  });
}
