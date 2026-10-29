"use client";

import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelMono } from "@/components/domain/ChannelChip";
import { cx } from "@/lib/cx";
import { formatDateTime, formatDayMonth } from "@/lib/format";
import type { PendingApproval } from "@/server/posts/approvals";
import type { MemberInfo } from "@/components/posts/PostCard";

/** Offene Freigaben; die dringendste mit Amber-Rahmen */
export function ApprovalList({ slug, items, members, isOwner }: { slug: string; items: PendingApproval[]; members: MemberInfo[]; isOwner: boolean }) {
  const t = useTranslations("approvals");
  const names = new Map(members.map((m) => [m.userId, m.fullName]));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((p, i) => (
        <li key={p.id}>
          <Link
            href={isOwner ? `/o/${slug}/approvals/review?start=${p.id}` : `/o/${slug}/posts/${p.id}`}
            className={cx(
              "flex items-center gap-3 rounded-lg bg-surface p-4 hover:shadow-sm",
              i === 0 ? "border-2 border-status-review" : "border border-border hover:border-border-strong",
            )}
          >
            {p.channels && <ChannelMono type={p.channels.type} size="lg" />}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-label font-bold">{p.title || t("untitled")}</span>
              <span className="inline-flex items-center gap-1 text-small text-text-muted">
                <CalendarClock aria-hidden className="icon-sm" />
                {p.scheduled_at ? formatDateTime(p.scheduled_at) : p.planned_on ? formatDayMonth(p.planned_on) : t("noDate")}
              </span>
              <span className="text-small text-text-muted">
                {t("requestedBy", { name: (p.requestedBy && names.get(p.requestedBy)) || t("someone") })}
              </span>
            </span>
            <ChevronRight aria-hidden className="text-text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
