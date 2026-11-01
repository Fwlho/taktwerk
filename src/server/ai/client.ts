import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiErrorKey } from "@/lib/ai";

/** Standardmodell, falls ANTHROPIC_MODEL leer ist */
export const DEFAULT_MODEL = "claude-opus-5-5";

export function aiModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

/** Testbetrieb ohne echte KI (Browser-Tests): feste Beispieltexte, keine Kosten */
export function aiFake(): boolean {
  return process.env.AI_FAKE === "1";
}

export function aiConfigured(): boolean {
  return aiFake() || Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

let client: Anthropic | undefined;

/** Schlüssel kommt aus ANTHROPIC_API_KEY (nur Server) */
export function anthropic(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return client;
}

export class AiError extends Error {
  constructor(readonly key: AiErrorKey) {
    super(key);
  }
}

/** SDK-Fehler → Fehlerschlüssel (typisierte Klassen, kein Textvergleich) */
export function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return new AiError("aiNotConfigured");
  if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError) {
    return new AiError("aiBusy");
  }
  console.error("[ai]", e instanceof Error ? e.message : e);
  return new AiError("aiFailed");
}
