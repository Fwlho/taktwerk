"use server";

import { z } from "zod";
import { getOrgContext } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/db/supabase";

const keySchema = z.string().regex(/^[a-z][a-z0-9_.]{0,63}$/);

/** Gemerkte Filter/Ansichten pro Person und Unternehmen */
export async function savePreference(slug: string, key: string, value: unknown) {
  if (!keySchema.safeParse(key).success) return;
  const json = JSON.stringify(value ?? null);
  if (json.length > 4000) return;
  const { organization, user } = await getOrgContext(slug);
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, organization_id: organization.id, key, value: JSON.parse(json) }, { onConflict: "user_id,organization_id,key" });
}
