"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ACCEPTED_MIME, kindForMime, maxBytesFor } from "@/lib/assets";
import { getOrgContext } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";
import { dbError, guard, type ActionResult } from "@/server/action-result";

const registerSchema = z.object({
  storagePath: z.string().min(40).max(400),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.enum(ACCEPTED_MIME),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  durationS: z.number().nonnegative().nullable(),
});

/** Nach dem Upload: Eintrag in der Mediathek anlegen. Bei Fehler wird die Datei wieder entfernt. */
export async function registerAsset(slug: string, input: z.input<typeof registerSchema>, postId?: string): Promise<ActionResult<{ id: string }>> {
  return guard(async () => {
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization, role } = await getOrgContext(slug);
    if (role === "viewer") return { error: "forbidden" };
    const v = parsed.data;
    const supabase = await createSupabaseServerClient();
    const kind = kindForMime(v.mimeType)!;

    const cleanup = async () => {
      await supabase.storage.from("assets").remove([v.storagePath]);
    };
    if (!v.storagePath.startsWith(`${organization.id}/`) || v.sizeBytes > maxBytesFor(kind)) {
      await cleanup();
      return { error: v.sizeBytes > maxBytesFor(kind) ? "fileTooLarge" : "invalid" };
    }

    const { data, error } = await supabase
      .from("assets")
      .insert({
        organization_id: organization.id,
        kind,
        storage_path: v.storagePath,
        file_name: v.fileName,
        mime_type: v.mimeType,
        size_bytes: v.sizeBytes,
        width: v.width,
        height: v.height,
        duration_s: v.durationS,
      })
      .select("id")
      .single();
    if (error) {
      await cleanup();
      return { error: dbError(error) };
    }

    if (postId) {
      const { count } = await supabase.from("post_assets").select("asset_id", { count: "exact", head: true }).eq("post_id", postId);
      const { error: linkErr } = await supabase
        .from("post_assets")
        .insert({ post_id: postId, asset_id: data.id, organization_id: organization.id, position: count ?? 0 });
      if (linkErr) return { error: dbError(linkErr) };
    }
    revalidatePath(`/o/${slug}/assets`);
    return { ok: true, data: { id: data.id } };
  });
}

const updateSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  altText: z.string().trim().max(500),
});

export async function updateAsset(slug: string, id: string, input: z.input<typeof updateSchema>): Promise<ActionResult> {
  return guard(async () => {
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return { error: "invalid" };
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
      .from("assets")
      .update({ file_name: parsed.data.fileName, alt_text: parsed.data.altText || null }, { count: "exact" })
      .eq("id", id)
      .eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    if (!count) return { error: "forbidden" };
    revalidatePath(`/o/${slug}/assets`);
    return { ok: true };
  });
}

export async function deleteAsset(slug: string, id: string): Promise<ActionResult> {
  return guard(async () => {
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { data: asset } = await supabase.from("assets").select("storage_path").eq("id", id).eq("organization_id", organization.id).maybeSingle();
    if (!asset) return { error: "gone" };
    const { error, count } = await supabase.from("assets").delete({ count: "exact" }).eq("id", id).eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    if (!count) return { error: "forbidden" };
    // Datei endgültig entfernen (DSGVO: keine verwaisten Dateien)
    await supabase.storage.from("assets").remove([asset.storage_path]);
    revalidatePath(`/o/${slug}`, "layout");
    return { ok: true };
  });
}

export async function linkAssets(slug: string, postId: string, assetIds: string[]): Promise<ActionResult> {
  return guard(async () => {
    const ids = z.array(z.uuid()).min(1).max(20).safeParse(assetIds);
    if (!ids.success) return { error: "invalid" };
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { data: existing } = await supabase.from("post_assets").select("asset_id").eq("post_id", postId);
    const have = new Set((existing ?? []).map((e) => e.asset_id));
    const add = ids.data.filter((id) => !have.has(id));
    if (add.length) {
      const { error } = await supabase
        .from("post_assets")
        .insert(add.map((asset_id, i) => ({ post_id: postId, asset_id, organization_id: organization.id, position: have.size + i })));
      if (error) return { error: dbError(error) };
    }
    revalidatePath(`/o/${slug}/posts/${postId}`);
    return { ok: true };
  });
}

export async function unlinkAsset(slug: string, postId: string, assetId: string): Promise<ActionResult> {
  return guard(async () => {
    const { organization } = await getOrgContext(slug);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("post_assets")
      .delete()
      .eq("post_id", postId)
      .eq("asset_id", assetId)
      .eq("organization_id", organization.id);
    if (error) return { error: dbError(error) };
    revalidatePath(`/o/${slug}/posts/${postId}`);
    return { ok: true };
  });
}
