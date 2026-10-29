"use client";

import {
  CalendarClock,
  ChartColumn,
  CircleCheck,
  Hourglass,
  Lightbulb,
  Pause,
  PencilLine,
  Play,
  RotateCcw,
  Send,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cx } from "@/lib/cx";
import type { CampaignStatus, PostStatus } from "@/lib/domain";

// Statusfarben laut Design; in_review/evaluated nutzen die Tokens status-review/status-analyzed.
const POST: Record<PostStatus, { icon: LucideIcon; cls: string; dot: string }> = {
  idea: { icon: Lightbulb, cls: "text-status-idea bg-status-idea-soft", dot: "bg-status-idea" },
  draft: { icon: PencilLine, cls: "text-status-draft bg-status-draft-soft", dot: "bg-status-draft" },
  in_review: { icon: Hourglass, cls: "text-status-review bg-status-review-soft", dot: "bg-status-review" },
  changes_requested: { icon: RotateCcw, cls: "text-warning bg-warning-soft", dot: "bg-warning" },
  approved: { icon: CircleCheck, cls: "text-status-approved bg-status-approved-soft", dot: "bg-status-approved" },
  scheduled: { icon: CalendarClock, cls: "text-status-scheduled bg-status-scheduled-soft", dot: "bg-status-scheduled" },
  published: { icon: Send, cls: "text-status-published bg-status-published-soft", dot: "bg-status-published-soft" },
  evaluated: { icon: ChartColumn, cls: "text-status-analyzed bg-status-analyzed-soft", dot: "bg-status-analyzed" },
};

export const POST_STATUS_ICON = Object.fromEntries(Object.entries(POST).map(([k, v]) => [k, v.icon])) as Record<PostStatus, LucideIcon>;
export const POST_STATUS_DOT = Object.fromEntries(Object.entries(POST).map(([k, v]) => [k, v.dot])) as Record<PostStatus, string>;

const badgeBase =
  "inline-flex h-6 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-caption whitespace-nowrap [&_svg]:size-3.5 [&_svg]:stroke-[2.25] transition-colors duration-(--duration-base)";

/** Beitragsstatus: immer Icon + Wort + Farbe. */
export function StatusBadge({ status, variant = "pill", className }: { status: PostStatus; variant?: "pill" | "dot"; className?: string }) {
  const t = useTranslations("posts.status");
  const s = POST[status];
  const Icon = s.icon;
  if (variant === "dot") {
    return (
      <span className={cx("inline-flex items-center gap-1.5 text-caption text-text", className)}>
        <span aria-hidden className={cx("size-2 rounded-full", s.dot)} />
        {t(status)}
      </span>
    );
  }
  return (
    <span className={cx(badgeBase, s.cls, className)}>
      <Icon aria-hidden />
      {t(status)}
    </span>
  );
}

// Kampagnenstatus: eigene Skala, nutzt aber die Statusfarben (CampaignCard-README)
const CAMPAIGN: Record<CampaignStatus, { icon: LucideIcon; cls: string }> = {
  draft: { icon: PencilLine, cls: "text-status-draft bg-status-draft-soft" },
  running: { icon: Play, cls: "text-status-scheduled bg-status-scheduled-soft" },
  paused: { icon: Pause, cls: "text-status-idea bg-status-idea-soft" },
  completed: { icon: ChartColumn, cls: "text-status-analyzed bg-status-analyzed-soft" },
};

export function CampaignStatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  const t = useTranslations("campaigns.status");
  const s = CAMPAIGN[status];
  const Icon = s.icon;
  return (
    <span className={cx(badgeBase, s.cls, className)}>
      <Icon aria-hidden />
      {t(status)}
    </span>
  );
}
