import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/server/env";
import type { Database } from "./database.types";

/** Client im Namen der angemeldeten Person – alle Zugriffe laufen durch RLS. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
          } catch {
            // In Server Components nicht setzbar – der Proxy erneuert die Sitzung.
          }
        },
      },
    },
  );
}

/**
 * Admin-Client mit geheimem Schlüssel – umgeht RLS.
 * Nur für Aufgaben ohne Nutzerkontext (z. B. Einladungs-Mail). Nie für Datenabfragen im Namen von Nutzern.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
