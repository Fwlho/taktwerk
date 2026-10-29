"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/server/db/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser-Client (nur für Datei-Uploads in den Storage; Daten laufen über Server Actions). */
export function supabaseBrowser() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  return client;
}
