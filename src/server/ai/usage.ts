import "server-only";
import type { createSupabaseServerClient } from "@/server/db/supabase";
import type { Database } from "@/server/db/database.types";
import { AiError } from "./client";

export type Db = Awaited<ReturnType<typeof createSupabaseServerClient>>;
export type AiKind = Database["public"]["Enums"]["ai_request_kind"];

type UsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  iterations?: unknown[] | null;
};

/** Summe über alle Versuche (bei Ersatzmodell mehrere), sonst die Gesamtwerte */
export function usageTotals(usage: UsageLike | null | undefined): { input: number; output: number } {
  if (!usage) return { input: 0, output: 0 };
  const sum = (u: UsageLike) => ({
    input: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
    output: u.output_tokens ?? 0,
  });
  const iterations = (usage.iterations ?? []) as UsageLike[];
  if (iterations.length === 0) return sum(usage);
  return iterations.map(sum).reduce((a, b) => ({ input: a.input + b.input, output: a.output + b.output }), { input: 0, output: 0 });
}

/** Anfrage anmelden (Rolle + Tageslimit prüft die Datenbank) */
export async function beginAiRequest(db: Db, organizationId: string, kind: AiKind): Promise<string> {
  const { data, error } = await db.rpc("begin_ai_request", { p_org: organizationId, p_kind: kind });
  if (error) {
    if (error.message === "ai_limit_reached") throw new AiError("aiLimit");
    if (error.code === "42501") throw new AiError("forbidden");
    throw new AiError("aiFailed");
  }
  return data;
}

/** Verbrauch nachtragen – Fehler hier dürfen das Ergebnis nicht verhindern */
export async function finishAiRequest(db: Db, id: string, model: string, usage: UsageLike | null | undefined) {
  const { input, output } = usageTotals(usage);
  const { error } = await db.rpc("finish_ai_request", { p_id: id, p_model: model, p_input: input, p_output: output });
  if (error) console.error("[ai] Verbrauch nicht gespeichert", error.message);
}

export async function aiUsageToday(db: Db, organizationId: string): Promise<{ used: number; limit: number }> {
  const { data } = await db.rpc("ai_usage_today", { p_org: organizationId });
  const row = data?.[0];
  return { used: row?.used ?? 0, limit: row?.daily_limit ?? 0 };
}
