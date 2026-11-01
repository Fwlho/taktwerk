/** Gemeinsame KI-Konstanten für Server und Browser (keine Geheimnisse). */

export const TEXT_MODES = ["write", "improve", "shorter", "longer", "casual", "question", "hashtags", "adapt"] as const;
export type TextMode = (typeof TEXT_MODES)[number];

/** Umformulierungen, die auf einen vorhandenen Text angewendet werden (Schnellbefehle) */
export const REWRITE_MODES = ["shorter", "longer", "casual", "question", "hashtags"] as const satisfies readonly TextMode[];

/** Erstes Onboarding-Ziel (ScreenOnboarding Schritt 3) */
export const FIRST_GOALS = ["inquiries", "recruiting", "awareness", "event"] as const;
export type FirstGoal = (typeof FIRST_GOALS)[number];

/**
 * Text-Stream: reiner Text; ein Fehler mitten im Stream wird mit dieser Marke + Fehlerschlüssel angehängt.
 * (Kann in normalem Text nicht vorkommen.)
 */
export const AI_STREAM_ERROR = "\u0000error:";

export const AI_ERROR_KEYS = ["aiNotConfigured", "aiLimit", "aiRefused", "aiBusy", "aiFailed", "forbidden"] as const;
export type AiErrorKey = (typeof AI_ERROR_KEYS)[number];

export function isAiErrorKey(value: unknown): value is AiErrorKey {
  return typeof value === "string" && (AI_ERROR_KEYS as readonly string[]).includes(value);
}

/** Zerlegt den empfangenen Stream-Text in Inhalt und ggf. Fehler. */
export function splitAiStream(raw: string): { text: string; error: AiErrorKey | null } {
  const i = raw.indexOf(AI_STREAM_ERROR);
  if (i === -1) return { text: raw, error: null };
  const key = raw.slice(i + AI_STREAM_ERROR.length).trim();
  return { text: raw.slice(0, i), error: isAiErrorKey(key) ? key : "aiFailed" };
}
