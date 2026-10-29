import "server-only";
import { createSupabaseServerClient } from "@/server/db/supabase";

const SIGNED_URL_SECONDS = 60 * 60;

type AssetRow = {
  id: string;
  kind: "image" | "video" | "logo" | "document";
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_s: number | null;
  alt_text: string | null;
  uploaded_by: string | null;
  created_at: string;
};

const FIELDS = "id, kind, storage_path, file_name, mime_type, size_bytes, width, height, duration_s, alt_text, uploaded_by, created_at";

/** Kurzlebige Links zu privaten Dateien (Bucket ist nicht öffentlich) */
async function withUrls<T extends AssetRow>(rows: T[]) {
  if (rows.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage.from("assets").createSignedUrls(
    rows.map((r) => r.storage_path),
    SIGNED_URL_SECONDS,
  );
  const urls = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }));
}

export async function listAssets(organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assets")
    .select(`${FIELDS}, post_assets(post_id)`)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return withUrls((data ?? []).map(({ post_assets, ...a }) => ({ ...a, usedIn: post_assets.length })));
}

export type AssetItem = Awaited<ReturnType<typeof listAssets>>[number];

export async function listAssetsForPost(organizationId: string, postId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("post_assets")
    .select(`position, assets(${FIELDS})`)
    .eq("organization_id", organizationId)
    .eq("post_id", postId)
    .order("position");
  if (error) throw error;
  return withUrls((data ?? []).flatMap((pa) => (pa.assets ? [{ ...pa.assets, usedIn: 1 }] : [])));
}
