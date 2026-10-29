import { cx } from "@/lib/cx";

/** Platzhalter in Endgröße der Inhalte – kein Layoutsprung. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("skeleton block", className)} />;
}
