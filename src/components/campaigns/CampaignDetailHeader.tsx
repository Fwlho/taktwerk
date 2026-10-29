"use client";

import { useState, useTransition } from "react";
import { CalendarDays, PencilLine, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelStack } from "@/components/domain/ChannelChip";
import { CampaignStatusBadge } from "@/components/domain/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { daysUntil, formatDateRange, formatEuro } from "@/lib/format";
import type { CampaignFormValues } from "@/lib/validation";
import { deleteCampaign } from "@/server/campaigns/actions";
import type { CampaignListItem } from "@/server/campaigns/queries";
import { BudgetBar, GOAL_ICON, useGoalLabel } from "./CampaignCard";
import { CampaignFormModal, type ChannelOption } from "./CampaignFormModal";

export function CampaignDetailHeader({
  slug,
  campaign,
  channels,
  canEdit,
  canDelete,
  defaults,
}: {
  slug: string;
  campaign: CampaignListItem;
  channels: ChannelOption[];
  canEdit: boolean;
  canDelete: boolean;
  defaults: CampaignFormValues;
}) {
  const t = useTranslations("campaigns");
  const te = useTranslations("errors");
  const toast = useToast();
  const goalLabel = useGoalLabel();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const GoalIcon = GOAL_ICON[campaign.goal];
  const range = formatDateRange(campaign.start_date, campaign.end_date);
  const remaining = campaign.end_date ? daysUntil(campaign.end_date) : null;

  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-h1">{campaign.name}</h1>
          <div className="flex flex-wrap gap-2">
            {canDelete && (
              <Button variant="ghost" icon={<Trash2 aria-hidden />} onClick={() => setConfirmDelete(true)} className="text-text-muted">
                {t("delete")}
              </Button>
            )}
            {canEdit && (
              <Button icon={<PencilLine aria-hidden />} onClick={() => setEditing(true)}>
                {t("edit")}
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body text-text-muted">
          <CampaignStatusBadge status={campaign.status} />
          <span className="inline-flex items-center gap-1">
            <GoalIcon aria-hidden className="icon-sm" />
            {goalLabel(campaign.goal, campaign.goal_target)}
            {campaign.goal_description && <> – {campaign.goal_description}</>}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays aria-hidden className="icon-sm" />
            {range.kind === "from" ? t("from", { date: range.text }) : range.text}
            {remaining != null && remaining >= 0 && campaign.status !== "completed" && <> ({t("daysLeft", { count: remaining })})</>}
          </span>
          {campaign.channelTypes.length > 0 && <ChannelStack types={campaign.channelTypes} />}
        </div>
      </header>

      <section aria-label={t("figures")} className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
          <span className="text-label font-normal text-text-muted">{t("goal")}</span>
          <span className="text-kpi text-text-muted">{campaign.goal_target != null ? `– / ${campaign.goal_target}` : "–"}</span>
          <span className="text-small text-text-muted">{t("figuresLater")}</span>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
          <span className="text-label font-normal text-text-muted">{t("posts")}</span>
          <span className="text-kpi">{campaign.postCount}</span>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 tablet:col-span-2">
          <span className="text-label font-normal text-text-muted">{t("budgetPlanned")}</span>
          <span className="text-kpi">{formatEuro(campaign.budget_planned_cents)}</span>
          <BudgetBar spentCents={campaign.budgetSpentCents} plannedCents={campaign.budget_planned_cents} />
        </div>
      </section>

      {canEdit && (
        <CampaignFormModal
          slug={slug}
          open={editing}
          onClose={() => setEditing(false)}
          channels={channels}
          campaignId={campaign.id}
          defaults={defaults}
        />
      )}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        variant="danger"
        size="sm"
        busy={pending}
        icon={<Trash2 />}
        title={t("deleteTitle", { name: campaign.name })}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)} disabled={pending} data-autofocus>
              {t("keep")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteCampaign(slug, campaign.id);
                  if (res?.error) {
                    setConfirmDelete(false);
                    toast({ kind: "error", title: te(res.error) });
                  }
                })
              }
            >
              {t("delete")}
            </Button>
          </>
        }
      >
        <p className="text-body text-text-muted">{t("deleteText", { count: campaign.postCount })}</p>
      </Modal>
    </>
  );
}
