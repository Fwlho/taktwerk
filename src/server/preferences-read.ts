import "server-only";
import { createSupabaseServerClient } from "@/server/db/supabase";

export async function readPreference<T>(organizationId: string, userId: string, key: string, fallback: T): Promise<T> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("value")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();
  return (data?.value as T | undefined) ?? fallback;
}
