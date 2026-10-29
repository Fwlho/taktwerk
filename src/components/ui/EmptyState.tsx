import type { ReactNode } from "react";
import { Check, CloudOff, SearchX } from "lucide-react";
import { cx } from "@/lib/cx";

export type EmptyStateKind = "first-use" | "done" | "no-results" | "error";

export type EmptyStateProps = {
  kind: EmptyStateKind;
  title: string;
  text?: string;
  /** Buttons/Links (Primär-, KI-, Nebenaktion) */
  actions?: ReactNode;
  inline?: boolean;
  className?: string;
};

function Art({ kind }: { kind: EmptyStateKind }) {
  if (kind === "first-use") {
    return (
      <div aria-hidden className="relative mb-2 h-[72px] w-24">
        <i className="absolute top-4 left-0 size-14 rounded-md bg-primary-soft" />
        <i className="absolute top-0 left-10 h-10 w-14 rounded-full bg-accent opacity-85" />
        <i className="absolute top-[34px] left-7 size-9 rounded-full bg-primary" />
      </div>
    );
  }
  const map = {
    done: { icon: <Check />, cls: "bg-success-soft text-success" },
    "no-results": { icon: <SearchX />, cls: "bg-surface-sunken text-text-muted" },
    error: { icon: <CloudOff />, cls: "bg-danger-soft text-danger" },
  } as const;
  const { icon, cls } = map[kind];
  return (
    <span aria-hidden className={cx("mb-2 inline-flex size-14 items-center justify-center rounded-full", cls)}>
      {icon}
    </span>
  );
}

/** Leerzustand – nie eine leere Fläche. */
export function EmptyState({ kind, title, text, actions, inline, className }: EmptyStateProps) {
  return (
    <div
      role={kind === "error" ? "alert" : undefined}
      className={cx(
        "mx-auto flex max-w-[440px] flex-col items-center gap-3 text-center",
        inline ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      {!inline && <Art kind={kind} />}
      <h2 className="text-h2">{title}</h2>
      {text && <p className="text-body text-text-muted">{text}</p>}
      {actions && <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
