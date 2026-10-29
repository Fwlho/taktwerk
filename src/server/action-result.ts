import "server-only";
import { ForbiddenError } from "@/server/auth/session";

export type ActionResult<T = undefined> = { ok?: true; data?: T; error?: string };

/** Übersetzt Rechtefehler und bekannte DB-Fehler in Fehlerschlüssel (messages: errors.*). */
export async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: "forbidden" };
    throw e;
  }
}

const DB_ERRORS: Record<string, string> = {
  last_owner: "lastOwner",
  comment_required: "commentRequired",
  schedule_required: "scheduleRequired",
  transition_forbidden: "forbidden",
  transition_system_only: "forbidden",
  post_published_locked: "publishedLocked",
  forbidden_field: "forbidden",
  post_not_found: "gone",
  assignee_viewer: "assigneeViewer",
};

export function dbError(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return "generic";
  if (error.message && DB_ERRORS[error.message]) return DB_ERRORS[error.message]!;
  if (error.code === "42501") return "forbidden";
  if (error.code === "23505") return "duplicate";
  return "generic";
}
