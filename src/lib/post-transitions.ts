import type { MemberRole } from "@/server/db/database.types";
import type { PostStatus } from "./domain";

// Spiegel der Regeln aus public.transition_post_status (Migration 20261030090000_kern.sql).
// Nur für die Oberfläche (Buttons, Ziel-Spalten). Entscheidend ist immer die Datenbank.

type Pair = `${PostStatus}>${PostStatus}`;

const BASE: Pair[] = [
  "idea>draft",
  "draft>idea",
  "idea>in_review",
  "draft>in_review",
  "in_review>draft",
  "changes_requested>draft",
  "changes_requested>in_review",
];

const RULES: Record<MemberRole, ReadonlySet<Pair>> = {
  owner: new Set<Pair>([
    ...BASE,
    "in_review>approved",
    "in_review>changes_requested",
    "idea>approved",
    "draft>approved",
    "changes_requested>approved",
    "approved>in_review",
    "approved>draft",
    "approved>scheduled",
    "scheduled>approved",
    "scheduled>draft",
  ]),
  editor: new Set<Pair>([...BASE, "approved>draft", "approved>scheduled", "scheduled>approved", "scheduled>draft"]),
  external: new Set<Pair>(BASE),
  viewer: new Set<Pair>(),
};

export function canTransition(role: MemberRole, from: PostStatus, to: PostStatus): boolean {
  if (from === to) return false;
  return RULES[role].has(`${from}>${to}`);
}

export function allowedTargets(role: MemberRole, from: PostStatus): PostStatus[] {
  return [...RULES[role]].filter((p) => p.startsWith(`${from}>`)).map((p) => p.split(">")[1] as PostStatus);
}

/** Status, die nur das System setzt */
export const SYSTEM_STATUSES: readonly PostStatus[] = ["published", "evaluated"];

/** Fortschritt für die 7-Schritt-Leiste (Änderung gewünscht zählt wie Entwurf) */
export function statusStep(status: PostStatus): number {
  const order: PostStatus[] = ["idea", "draft", "in_review", "approved", "scheduled", "published", "evaluated"];
  return order.indexOf(status === "changes_requested" ? "draft" : status) + 1;
}
