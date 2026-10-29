"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cx } from "@/lib/cx";
import { CAMPAIGN_STATUSES, type CampaignStatus } from "@/lib/domain";
import type { CampaignListItem } from "@/server/campaigns/queries";
import { CampaignCard } from "./CampaignCard";
import { CampaignFormModal, type ChannelOption } from "./CampaignFormModal";

type Sort = "newest" | "start" | "name";

export function CampaignsView({
  slug,
  campaigns,
  channels,
  canCreate,
}: {
  slug: string;
  campaigns: CampaignListItem[];
  channels: ChannelOption[];
  canCreate: boolean;
}) {
  const t = useTranslations("campaigns");
  const ts = useTranslations("campaigns.status");
  const [tab, setTab] = useState<"all" | CampaignStatus>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: campaigns.length };
    for (const s of CAMPAIGN_STATUSES) c[s] = campaigns.filter((x) => x.status === s).length;
    return c;
  }, [campaigns]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = campaigns.filter((c) => (tab === "all" || c.status === tab) && (!q || c.name.toLowerCase().includes(q)));
    return [...list].sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "de")
        : sort === "start"
          ? a.start_date.localeCompare(b.start_date)
          : b.created_at.localeCompare(a.created_at),
    );
  }, [campaigns, tab, query, sort]);

  const running = counts.running ?? 0;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 tablet:mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">{t("title")}</h1>
          {campaigns.length > 0 && <p className="text-body text-text-muted">{t("summary", { count: campaigns.length, running })}</p>}
        </div>
        {canCreate && (
          <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => setCreating(true)}>
            {t("new")}
          </Button>
        )}
      </header>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            kind="first-use"
            title={t("emptyTitle")}
            text={t("emptyText")}
            actions={
              canCreate && (
                <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => setCreating(true)}>
                  {t("new")}
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div role="tablist" aria-label={t("filterLabel")} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-md bg-surface-sunken p-[3px]">
              {(["all", ...CAMPAIGN_STATUSES] as const).map((key) => (
                <button
                  key={key}
                  role="tab"
                  type="button"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cx(
                    "inline-flex h-[34px] items-center rounded-[8px] px-4 text-label whitespace-nowrap",
                    tab === key ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text",
                  )}
                >
                  {key === "all" ? t("all") : ts(key)} · {counts[key] ?? 0}
                </button>
              ))}
            </div>
            <label className="relative ml-auto flex min-w-48 flex-1 items-center tablet:max-w-72 tablet:flex-none">
              <span className="sr-only">{t("search")}</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 text-text-muted icon-sm" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                className="h-10 w-full rounded-md border border-border-strong bg-surface pr-3 pl-9 text-body hover:border-text focus-visible:border-focus"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="sr-only">{t("sortLabel")}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-10 cursor-pointer rounded-md border border-border-strong bg-surface px-3 text-label hover:border-text"
              >
                <option value="newest">{t("sort.newest")}</option>
                <option value="start">{t("sort.start")}</option>
                <option value="name">{t("sort.name")}</option>
              </select>
            </label>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState
                kind="no-results"
                title={t("noResultsTitle")}
                text={t("noResultsText", { filter: query || (tab === "all" ? t("all") : ts(tab)) })}
                actions={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setQuery("");
                      setTab("all");
                    }}
                  >
                    {t("resetFilter")}
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
              {visible.map((c) => (
                <li key={c.id}>
                  <CampaignCard slug={slug} campaign={c} />
                </li>
              ))}
              {canCreate && (
                <li>
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong p-5 text-label text-text-muted hover:bg-surface-hover hover:text-text"
                  >
                    <Plus aria-hidden />
                    {t("newTile")}
                  </button>
                </li>
              )}
            </ul>
          )}
        </>
      )}

      {canCreate && <CampaignFormModal slug={slug} open={creating} onClose={() => setCreating(false)} channels={channels} />}
    </>
  );
}
