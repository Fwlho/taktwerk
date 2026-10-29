import "server-only";
import { cache } from "react";
import { CHANNEL_TYPES } from "@/lib/domain";
import { createSupabaseServerClient } from "@/server/db/supabase";

export const listChannels = cache(async (organizationId: string) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("channels")
    .select("id, type, name, connection_status, external_account_name")
    .eq("organization_id", organizationId);
  if (error) throw error;
  return (data ?? []).sort((a, b) => CHANNEL_TYPES.indexOf(a.type) - CHANNEL_TYPES.indexOf(b.type));
});

export type ChannelRow = Awaited<ReturnType<typeof listChannels>>[number];
