"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { PostThread } from "@/server/posts/queries";
import type { MemberInfo } from "./PostCard";

type Entry = PostThread["activity"][number];
type Change = { from?: unknown; to?: unknown } | string | unknown;

/** Verlauf: wer hat was wann geändert (ohne Inhalte). */
export function ActivityList({ entries, members }: { entries: Entry[]; members: Map<string, MemberInfo> }) {
  const t = useTranslations("posts.activity");
  const ts = useTranslations("posts.status");
  const format = useFormatter();

  function describe(e: Entry): string {
    const changes = (e.changes ?? {}) as Record<string, Change>;
    if (e.entity_type === "posts") {
      if (e.action === "insert") return t("created");
      const status = changes.status as { from?: string; to?: string } | undefined;
      if (status?.to) return t("status", { from: ts(status.from as never), to: ts(status.to as never) });
      const fields = Object.keys(changes)
        .map((k) => (t.has(`fields.${k}`) ? t(`fields.${k}` as never) : null))
        .filter(Boolean);
      return fields.length ? t("changed", { fields: fields.join(", ") }) : t("updated");
    }
    if (e.entity_type === "approvals") {
      const decision = (changes.decision as string | undefined) ?? "";
      return decision === "approved" ? t("approved") : t("changesRequested");
    }
    if (e.entity_type === "comments") return e.action === "delete" ? t("commentDeleted") : t("commented");
    if (e.entity_type === "post_assignees") return e.action === "delete" ? t("unassigned") : t("assigned");
    return t("updated");
  }

  if (entries.length === 0) return <p className="text-small text-text-muted">{t("empty")}</p>;

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-col border-l-2 border-border pl-3">
          <span className="text-small">
            <b className="font-semibold">{(e.actor_id && members.get(e.actor_id)?.fullName) || t("system")}</b> {describe(e)}
          </span>
          <time dateTime={e.created_at} className="text-caption font-normal text-text-muted">
            {format.dateTime(new Date(e.created_at), { dateStyle: "medium", timeStyle: "short" })}
          </time>
        </li>
      ))}
    </ol>
  );
}
