"use client";

import Link from "next/link";
import { CalendarDays, FileText, Handshake, Megaphone, Target, Users, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelStack } from "@/components/domain/ChannelChip";
import { CampaignStatusBadge } from "@/components/domain/StatusBadge";
import { cx } from "@/lib/cx";
import type { CampaignGoal } from "@/lib/domain";
import { formatDateRange, formatEuro } from "@/lib/format";
import type { CampaignListItem } from "@/server/campaigns/queries";

export const GOAL_ICON: Record<CampaignGoal, LucideIcon> = {
  inquiries: Target,
  recruiting: Users,
  awareness: Megaphone,
  event: Handshake,
  other: Target,
};

export function useGoalLabel() {
  const t = useTranslations("campaigns");
  return (goal: CampaignGoal, target: number | null) =>
    target != null ? t("goalWithTarget", { target, goal: t(`goalUnits.${goal}`) }) : t("goalOnly", { goal: t(`goals.${goal}`) });
}

/** Budgetbalken: ab 85 % Warnfarbe */
export function BudgetBar({ spentCents, plannedCents }: { spentCents: number; plannedCents: number }) {
  const t = useTranslations("campaigns");
  const ratio = plannedCents > 0 ? spentCents / plannedCents : 0;
  const warn = ratio >= 0.85;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-small text-text-muted">
        <span>{t("budget")}</span>
        <span>
          <b className="font-semibold text-text tabular-nums">{formatEuro(spentCents)}</b> {t("of")} {formatEuro(plannedCents)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={t("budget")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
        className="h-2 overflow-hidden rounded-full bg-surface-sunken"
      >
        <i className={cx("block h-full rounded-full", warn ? "bg-warning" : "bg-primary")} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
    </div>
  );
}

export function CampaignCard({ slug, campaign }: { slug: string; campaign: CampaignListItem }) {
  const t = useTranslations("campaigns");
  const goalLabel = useGoalLabel();
  const GoalIcon = GOAL_ICON[campaign.goal];
  const range = formatDateRange(campaign.start_date, campaign.end_date);

  return (
    <Link
      href={`/o/${slug}/campaigns/${campaign.id}`}
      className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 transition-[box-shadow,border-color] duration-(--duration-fast) ease-standard hover:border-border-strong hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-h3">{campaign.name}</h2>
          <span className="inline-flex items-center gap-1 text-small text-text-muted">
            <GoalIcon aria-hidden className="icon-sm" />
            {goalLabel(campaign.goal, campaign.goal_target)}
          </span>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-small text-text-muted">
        <span className="inline-flex items-center gap-1">
          <CalendarDays aria-hidden className="size-[15px]" />
          {range.kind === "from" ? t("from", { date: range.text }) : range.text}
        </span>
        <span className="inline-flex items-center gap-1">
          <FileText aria-hidden className="size-[15px]" />
          {t("postCount", { count: campaign.postCount })}
        </span>
      </div>
      <BudgetBar spentCents={campaign.budgetSpentCents} plannedCents={campaign.budget_planned_cents} />
      <div className="mt-auto flex items-center justify-between gap-2">
        {campaign.channelTypes.length > 0 ? (
          <ChannelStack types={campaign.channelTypes} />
        ) : (
          <span className="text-small text-text-muted">{t("noChannels")}</span>
        )}
      </div>
    </Link>
  );
}
