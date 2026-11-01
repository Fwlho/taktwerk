/** Veröffentlichen: gemeinsame Werte für Server und Oberfläche */
import type { ChannelType } from "./domain";

/** Kanäle, die sich schon verbinden lassen */
export const CONNECTABLE_CHANNELS: readonly ChannelType[] = ["facebook"];

export const PUBLISH_ERROR_CODES = ["expired", "busy", "rejected", "videoUnsupported", "emptyPost", "notConnected", "tooManyImages", "unknown"] as const;
export type PublishErrorCode = (typeof PUBLISH_ERROR_CODES)[number];

/** Gespeicherter Fehler „code“ oder „code: Plattform-Meldung“ → Code + Detail */
export function parsePublishError(value: string | null | undefined): { code: PublishErrorCode; detail: string | null } | null {
  if (!value) return null;
  const i = value.indexOf(":");
  const code = (i === -1 ? value : value.slice(0, i)).trim();
  const detail = i === -1 ? null : value.slice(i + 1).trim() || null;
  return (PUBLISH_ERROR_CODES as readonly string[]).includes(code) ? { code: code as PublishErrorCode, detail } : { code: "unknown", detail: value };
}
