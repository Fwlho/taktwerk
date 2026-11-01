import type { PostStatus } from "./domain";

/** Gilt als „fertig vorbereitet“: freigegeben oder weiter */
export const DONE_STATUSES: readonly PostStatus[] = ["approved", "scheduled", "published", "evaluated"];

export function progress(statuses: PostStatus[]): { done: number; total: number; ratio: number } {
  const total = statuses.length;
  const done = statuses.filter((s) => DONE_STATUSES.includes(s)).length;
  return { done, total, ratio: total ? done / total : 0 };
}

export type DayState = "empty" | "open" | "review" | "changes" | "done";

/**
 * Ein Statuspunkt pro Tag: das Dringendste gewinnt.
 * Änderung gewünscht > Zur Freigabe > noch in Arbeit > alles fertig.
 */
export function dayState(statuses: PostStatus[]): DayState {
  if (statuses.length === 0) return "empty";
  if (statuses.includes("changes_requested")) return "changes";
  if (statuses.includes("in_review")) return "review";
  if (statuses.some((s) => s === "idea" || s === "draft")) return "open";
  return "done";
}

export const DAY_STATE_DOT: Record<DayState, string> = {
  empty: "border border-border-strong bg-transparent",
  open: "bg-status-draft",
  review: "bg-status-review",
  changes: "bg-warning",
  done: "bg-status-approved",
};
