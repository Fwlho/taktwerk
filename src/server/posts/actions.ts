"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { POST_STATUSES } from "@/lib/domain";
import { berlinLocalToIso, todayBerlin } from "@/lib/format";
import { newPostSchema, postContentSchema, type NewPostFormValues, type PostContentInput } from "@/lib/validation";
import { getOrgContext, requirePermission } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { dbError, guard, type ActionResult } from "@/server/action-result";
import { sendPendingPushes } from "@/server/push/send";

const berlinDay = (iso: string) => todayBerlin(new Date(iso));

function revalidatePosts(slug: string) {
  revalidatePath(`/o/${slug}`, "layout");
}

export async function createPost(slug: string, input: NewPostFormValues): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const parsed = newPostSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "posts.create");
    const v = parsed.data;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("posts")
      .insert({
        organization_id: organization.id,
        channel_id: v.channelId,
        campaign_id: v.campaignId,
        title: v.title,
        planned_on: v.plannedOn,
        scheduled_at: v.plannedOn && v.time ? berlinLocalToIso(v.plannedOn, v.time) : null,
        status: v.status,
      })
      .select("id")
      .single();
    if (error) return { error: dbError(error) };
    revalidatePosts(slug);
    return { ok: true, data: { id: data.id } };
  });
}

/**
 * Automatisches Speichern. Optimistische Sperre über `version`:
 * hat jemand anderes inzwischen gespeichert, kommt „conflict“ zurück.
 */
export async function savePostContent(
  slug: string,
  postId: string,
  version: number,
  input: PostContentInput,
): Promise<ActionResult<{ version: number; status: string }>> {
  return guard(async () => {
    const parsed = postContentSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization, role } = await getOrgContext(slug);
    const v = parsed.data;
    const supabase = await createSupabaseServerClient();
    // Externe dürfen nur Texte ändern (DB erzwingt das ebenfalls)
    const patch =
      role === "external"
        ? { title: v.title, body: v.body, internal_notes: v.internalNotes || null }
        : {
            title: v.title,
            body: v.body,
            internal_notes: v.internalNotes || null,
            channel_id: v.channelId,
            campaign_id: v.campaignId,
            planned_on: v.plannedOn,
            scheduled_at: v.scheduledAt,
          };
    const { data, error } = await supabase
      .from("posts")
      .update(patch)
      .eq("id", postId)
      .eq("organization_id", organization.id)
      .eq("version", version)
      .select("version, status");
    if (error) return { error: dbError(error) };
    if (!data?.length) return { error: "conflict" };
    return { ok: true, data: { version: data[0]!.version, status: data[0]!.status } };
  });
}

const statusSchema = z.enum(POST_STATUSES);

export async function transitionPost(
  slug: string,
  postId: string,
  to: string,
  comment?: string,
): Promise<ActionResult<{ status: string; version: number }>> {
  return guard(async () => {
    const parsedTo = statusSchema.safeParse(to);
    if (!parsedTo.success) return { error: "invalid" };
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("transition_post_status", {
      p_post_id: postId,
      p_to: parsedTo.data,
      p_comment: comment?.trim() || undefined,
    });
    if (error) return { error: dbError(error) };
    after(() => sendPendingPushes(organization.id));
    revalidatePosts(slug);
    return { ok: true, data: { status: data.status, version: data.version } };
  });
}

export async function transitionPosts(slug: string, postIds: string[], to: string, comment?: string): Promise<ActionResult> {
  return guard(async () => {
    const parsedTo = statusSchema.safeParse(to);
    const ids = z.array(z.uuid()).min(1).max(200).safeParse(postIds);
    if (!parsedTo.success || !ids.success) return { error: "invalid" };
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("transition_posts_status", {
      p_post_ids: ids.data,
      p_to: parsedTo.data,
      p_comment: comment?.trim() || undefined,
    });
    if (error) return { error: dbError(error) };
    after(() => sendPendingPushes(organization.id));
    revalidatePosts(slug);
    return { ok: true };
  });
}

/** Termin setzen und – falls freigegeben – direkt einplanen */
export async function schedulePost(slug: string, postId: string, scheduledAt: string, version?: number): Promise<ActionResult> {
  return guard(async () => {
    const at = z.iso.datetime({ offset: true }).safeParse(scheduledAt);
    if (!at.success || new Date(at.data) <= new Date()) return { error: "scheduleRequired" };
    const { organization } = await requirePermission(slug, "posts.schedule");
    const supabase = await createSupabaseServerClient();
    let q = supabase
      .from("posts")
      .update({ scheduled_at: at.data, planned_on: berlinDay(at.data) })
      .eq("id", postId)
      .eq("organization_id", organization.id);
    if (version != null) q = q.eq("version", version);
    const { data, error } = await q.select("status");
    if (error) return { error: dbError(error) };
    if (!data?.length) return { error: "conflict" };
    if (data[0]!.status === "approved") {
      const { error: tErr } = await supabase.rpc("transition_post_status", { p_post_id: postId, p_to: "scheduled" });
      if (tErr) return { error: dbError(tErr) };
    }
    revalidatePosts(slug);
    return { ok: true };
  });
}

/** Verschieben im Kalender: neuer Tag, Uhrzeit bleibt */
export async function movePost(slug: string, postId: string, plannedOn: string, scheduledAt: string | null): Promise<ActionResult> {
  return guard(async () => {
    const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(plannedOn);
    const at = z.iso.datetime({ offset: true }).nullable().safeParse(scheduledAt);
    if (!day.success || !at.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "posts.schedule");
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("posts")
      .update({ planned_on: day.data, scheduled_at: at.data }, { count: "exact" })
      .eq("id", postId)
      .eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    if (!count) return { error: "gone" };
    revalidatePosts(slug);
    return { ok: true };
  });
}

export async function deletePost(slug: string, postId: string): Promise<ActionResult> {
  return guard(async () => {
    const { organization } = await requirePermission(slug, "posts.delete");
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("posts")
      .delete({ count: "exact" })
      .eq("id", postId)
      .eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    if (!count) return { error: "publishedLocked" };
    revalidatePosts(slug);
    return { ok: true };
  });
}

/** Beitrag auf weitere Kanäle übertragen: Kopien in derselben Gruppe (KI-Anpassung folgt in Phase 3). */
export async function transferPost(slug: string, postId: string, channelIds: string[]): Promise<ActionResult<{ ids: string[] }>> {
  return guard(async () => {
    const ids = z.array(z.uuid()).min(1).max(6).safeParse(channelIds);
    if (!ids.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "posts.create");
    const supabase = await createSupabaseServerClient();
    const { data: post, error } = await supabase
      .from("posts")
      .select("id, title, body, internal_notes, campaign_id, group_id, planned_on")
      .eq("id", postId)
      .eq("organization_id", organization.id)
      .single();
    if (error) return { error: dbError(error) };

    let groupId = post.group_id;
    if (!groupId) {
      const { data: group, error: gErr } = await supabase
        .from("post_groups")
        .insert({ organization_id: organization.id, title: post.title })
        .select("id")
        .single();
      if (gErr) return { error: dbError(gErr) };
      groupId = group.id;
      const { error: uErr } = await supabase.from("posts").update({ group_id: groupId }).eq("id", post.id);
      if (uErr) return { error: dbError(uErr) };
    }

    const { data: created, error: cErr } = await supabase
      .from("posts")
      .insert(
        ids.data.map((channel_id) => ({
          organization_id: organization.id,
          channel_id,
          group_id: groupId,
          campaign_id: post.campaign_id,
          title: post.title,
          body: post.body,
          internal_notes: post.internal_notes,
          planned_on: post.planned_on,
          status: "draft" as const,
        })),
      )
      .select("id");
    if (cErr) return { error: dbError(cErr) };
    revalidatePosts(slug);
    return { ok: true, data: { ids: (created ?? []).map((c) => c.id) } };
  });
}

// ---------------------------------------------------------------------------
// Zuständige, Kommentare, KI-Prompts
// ---------------------------------------------------------------------------

export async function setAssignees(slug: string, postId: string, userIds: string[]): Promise<ActionResult> {
  return guard(async () => {
    const ids = z.array(z.uuid()).max(20).safeParse(userIds);
    if (!ids.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "posts.assign");
    const supabase = await createSupabaseServerClient();
    const { data: current, error } = await supabase.from("post_assignees").select("user_id").eq("post_id", postId);
    if (error) return { error: dbError(error) };
    const have = new Set((current ?? []).map((a) => a.user_id));
    const want = new Set(ids.data);
    const remove = [...have].filter((id) => !want.has(id));
    const add = [...want].filter((id) => !have.has(id));
    if (remove.length) {
      const { error: e } = await supabase.from("post_assignees").delete().eq("post_id", postId).in("user_id", remove);
      if (e) return { error: dbError(e) };
    }
    if (add.length) {
      const { error: e } = await supabase
        .from("post_assignees")
        .insert(add.map((user_id) => ({ post_id: postId, user_id, organization_id: organization.id })));
      if (e) return { error: dbError(e) };
      after(() => sendPendingPushes(organization.id));
    }
    revalidatePosts(slug);
    return { ok: true };
  });
}

const commentSchema = z.object({ body: z.string().trim().min(1).max(5000), quotedText: z.string().max(500).optional() });

export async function addComment(slug: string, postId: string, input: { body: string; quotedText?: string }): Promise<ActionResult> {
  return guard(async () => {
    const parsed = commentSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("comments").insert({
      organization_id: organization.id,
      post_id: postId,
      body: parsed.data.body,
      quoted_text: parsed.data.quotedText || null,
    });
    if (error) return { error: dbError(error) };
    after(() => sendPendingPushes(organization.id));

    revalidatePath(`/o/${slug}/posts/${postId}`);
    return { ok: true };
  });
}

export async function deleteComment(slug: string, commentId: string, postId: string): Promise<ActionResult> {
  return guard(async () => {
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("comments")
      .delete({ count: "exact" })
      .eq("id", commentId)
      .eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    if (!count) return { error: "forbidden" };
    revalidatePath(`/o/${slug}/posts/${postId}`);
    return { ok: true };
  });
}

const promptSchema = z.object({
  kind: z.enum(["text", "image", "video", "caption"]),
  prompt: z.string().max(10000),
});

export async function addPrompt(slug: string, postId: string, input: { kind: string; prompt: string; position: number }): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const parsed = promptSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("post_ai_prompts")
      .insert({ organization_id: organization.id, post_id: postId, ...parsed.data, position: Math.max(0, Math.floor(input.position)) })
      .select("id")
      .single();
    if (error) return { error: dbError(error) };
    return { ok: true, data: { id: data.id } };
  });
}

export async function updatePrompt(slug: string, promptId: string, input: { kind: string; prompt: string }): Promise<ActionResult> {
  return guard(async () => {
    const parsed = promptSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("post_ai_prompts").update(parsed.data).eq("id", promptId).eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    return { ok: true };
  });
}

export async function deletePrompt(slug: string, promptId: string): Promise<ActionResult> {
  return guard(async () => {
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("post_ai_prompts").delete().eq("id", promptId).eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    return { ok: true };
  });
}

export async function reorderPrompts(slug: string, orderedIds: string[]): Promise<ActionResult> {
  return guard(async () => {
    const ids = z.array(z.uuid()).max(100).safeParse(orderedIds);
    if (!ids.success) return { error: "invalid" };
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    for (const [position, id] of ids.data.entries()) {
      const { error } = await supabase.from("post_ai_prompts").update({ position }).eq("id", id).eq("organization_id", organization.id);
      if (error) return { error: dbError(error) };
    }
    return { ok: true };
  });
}

export async function savePromptTemplate(slug: string, input: { name: string; kind: string; prompt: string }): Promise<ActionResult> {
  return guard(async () => {
    const parsed = promptSchema.extend({ name: z.string().trim().min(1).max(120), prompt: z.string().min(1).max(10000) }).safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "posts.create");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("prompt_templates").insert({ organization_id: organization.id, ...parsed.data });
    if (error) return { error: dbError(error) };
    return { ok: true };
  });
}

const ideasInputSchema = z.object({
  channelId: z.uuid(),
  campaignId: z.uuid().nullable().optional(),
  ideas: z
    .array(z.object({ title: z.string().trim().min(1).max(200), body: z.string().max(5000), plannedOn: z.iso.date().nullable().optional() }))
    .min(1)
    .max(10),
});

/** KI-Ideen als Beiträge im Status „Idee“ anlegen; die Beschreibung landet in den internen Notizen. */
export async function createIdeaPosts(
  slug: string,
  input: { channelId: string; campaignId?: string | null; ideas: { title: string; body: string; plannedOn?: string | null }[] },
): Promise<ActionResult<{ ids: string[] }>> {
  return guard(async () => {
    const parsed = ideasInputSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await requirePermission(slug, "posts.create");
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("posts")
      .insert(
        parsed.data.ideas.map((idea) => ({
          organization_id: organization.id,
          channel_id: parsed.data.channelId,
          campaign_id: parsed.data.campaignId ?? null,
          title: idea.title,
          internal_notes: idea.body || null,
          planned_on: idea.plannedOn ?? null,
          status: "idea" as const,
        })),
      )
      .select("id");
    if (error) return { error: dbError(error) };
    revalidatePosts(slug);
    return { ok: true, data: { ids: (data ?? []).map((d) => d.id) } };
  });
}
