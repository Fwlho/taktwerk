"use client";

import Link from "next/link";
import { CalendarCheck, Circle, CircleCheck, Flag, Hourglass, Send } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { IdeasSuggestion } from "@/components/ai/IdeasSuggestion";
import { CalendarEntry } from "@/components/calendar/CalendarEntry";
import { ActivityList } from "@/components/posts/ActivityList";
import { PostCard, type MemberInfo } from "@/components/posts/PostCard";
import { Banner } from "@/components/ui/Banner";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { addDays, postDay } from "@/lib/calendar";
import { cx } from "@/lib/cx";
import { formatDateTime, formatDayMonth, formatEuro, parseDateOnly } from "@/lib/format";
import type { MemberRole } from "@/server/db/database.types";
import type { DashboardData } from "@/server/dashboard/queries";
import type { ChannelType } from "@/lib/domain";

type ChecklistItem = { key: "profile" | "channels" | "campaign"; done: boolean; href: string | null };

export function DashboardView({
  slug,
  role,
  firstName,
  organizationName,
  data,
  members,
  checklist,
  channels,
  aiConfigured,
}: {
  slug: string;
  role: MemberRole;
  firstName: string;
  organizationName: string;
  data: DashboardData;
  members: MemberInfo[];
  checklist: ChecklistItem[];
  channels: { id: string; type: ChannelType }[];
  aiConfigured: boolean;
}) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const hour = Number(new Intl.DateTimeFormat("de-DE", { hour: "numeric", timeZone: "Europe/Berlin" }).format(new Date()));
  const greeting = hour < 11 ? "morning" : hour < 18 ? "day" : "evening";
  const base = `/o/${slug}`;

  const byDay = new Map<string, DashboardData["weekPosts"]>();
  for (const p of data.weekPosts) {
    const { day } = postDay(p);
    if (day) byDay.set(day, [...(byDay.get(day) ?? []), p]);
  }
  for (const list of byDay.values()) list.sort((a, b) => (postDay(a).time ?? "").localeCompare(postDay(b).time ?? ""));
  const plannedThisWeek = data.weekPosts.length;
  const todayAndTomorrow = [data.today, addDays(data.today, 1)].flatMap((d) => byDay.get(d) ?? []);
  const firstPending = data.pending.find((p) => p.scheduled_at);
  const showChecklist = checklist.some((c) => !c.done);

  const tiles = [
    { key: "plannedWeek", icon: CalendarCheck, value: plannedThisWeek, href: `${base}/calendar?view=week` },
    { key: "pending", icon: Hourglass, value: data.pending.length, href: `${base}/approvals` },
    { key: "running", icon: Flag, value: data.campaigns.length, href: `${base}/campaigns` },
    { key: "published", icon: Send, value: data.publishedThisMonth, href: `${base}/posts` },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 desktop:text-display">{t(`greeting.${greeting}`, { name: firstName || organizationName })}</h1>
        <p className="text-body-lg text-text-muted">
          {format.dateTime(parseDateOnly(data.today), { weekday: "long", day: "numeric", month: "long" })} ·{" "}
          {t("weekSummary", { count: plannedThisWeek })}
        </p>
      </header>

      {data.pending.length > 0 && (role === "owner" || role === "editor") && (
        <Banner
          kind="warning"
          icon={<Hourglass aria-hidden />}
          action={
            role === "owner" ? (
              <Link href={`${base}/approvals/review`} className={buttonClasses({ variant: "primary", size: "sm" })}>
                {t("approveNow")}
              </Link>
            ) : (
              <Link href={`${base}/approvals`} className={buttonClasses({ size: "sm" })}>
                {t("showApprovals")}
              </Link>
            )
          }
        >
          {role === "owner" ? t("pendingOwner", { count: data.pending.length }) : t("pendingOthers", { count: data.pending.length })}
          {firstPending?.scheduled_at && <> {t("firstAt", { when: formatDateTime(firstPending.scheduled_at) })}</>}
        </Banner>
      )}

      <section aria-label={t("figures")} className="grid grid-cols-2 gap-4 desktop:grid-cols-4">
        {tiles.map(({ key, icon: Icon, value, href }) => (
          <Link
            key={key}
            href={href}
            className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 transition-[box-shadow,border-color] hover:border-border-strong hover:shadow-sm"
          >
            <span className="flex items-center gap-2 text-label font-normal text-text-muted">
              <Icon aria-hidden className="icon-sm" />
              {t(`tiles.${key}`)}
            </span>
            <span className="text-kpi">{value}</span>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 desktop:grid-cols-12">
        <div className="flex flex-col gap-4 desktop:col-span-8">
          <section aria-labelledby="week-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 id="week-h" className="text-h2">
                <span className="hidden tablet:inline">{t("thisWeek")}</span>
                <span className="tablet:hidden">{t("todayTomorrow")}</span>
              </h2>
              <Link href={`${base}/calendar`} className="text-label text-primary hover:underline">
                {t("toCalendar")}
              </Link>
            </div>

            {/* Tablet/Desktop: 7-Tage-Streifen */}
            {plannedThisWeek === 0 ? (
              <EmptyState
                kind="first-use"
                inline
                title={t("weekEmptyTitle")}
                text={t("weekEmptyText")}
                actions={
                  role === "owner" || role === "editor" ? (
                    <Link href={`${base}/calendar?view=week`} className={buttonClasses({ variant: "ghost" })}>
                      {t("planNow")}
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <>
                <ol className="hidden flex-col divide-y divide-border tablet:flex">
                  {data.days.map((day) => {
                    const list = byDay.get(day) ?? [];
                    const isToday = day === data.today;
                    return (
                      <li key={day} className={cx("flex gap-3 py-2", isToday && "-mx-2 rounded-md bg-primary-soft px-2")}>
                        <span className={cx("w-28 flex-none pt-1 text-small", isToday ? "font-semibold text-primary" : "text-text-muted")}>
                          {format.dateTime(parseDateOnly(day), { weekday: "short", day: "numeric" })}
                          {isToday && <> · {t("today")}</>}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                          {list.length === 0 ? (
                            <span className="pt-1 text-small text-text-muted">–</span>
                          ) : (
                            list.map((p) => (
                              <div key={p.id} className="w-full max-w-72 min-w-0">
                                <CalendarEntry slug={slug} post={p} draggable={false} />
                              </div>
                            ))
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {/* Mobil: Heute & morgen */}
                <ul className="flex flex-col gap-3 tablet:hidden">
                  {todayAndTomorrow.length === 0 ? (
                    <li className="text-body text-text-muted">{t("nothingToday")}</li>
                  ) : (
                    todayAndTomorrow.map((p) => (
                      <li key={p.id}>
                        <PostCard slug={slug} post={p} members={memberMap} />
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </section>

          {data.campaigns.length > 0 && (
            <section aria-labelledby="camp-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
              <h2 id="camp-h" className="text-h2">
                {t("runningCampaigns")}
              </h2>
              <ul className="flex flex-col divide-y divide-border">
                {data.campaigns.map((c) => (
                  <li key={c.id}>
                    <Link href={`${base}/campaigns/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:underline">
                      <span className="min-w-0 flex-1 text-label">{c.name}</span>
                      {c.end_date && <span className="text-small text-text-muted">{t("until", { date: formatDayMonth(c.end_date) })}</span>}
                      <span className="text-small text-text-muted">{t("postCount", { count: c.postCount })}</span>
                      {c.budget_planned_cents > 0 && <span className="text-small text-text-muted tabular-nums">{formatEuro(c.budget_planned_cents)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-4 desktop:col-span-4">
          {(role === "owner" || role === "editor") && <IdeasSuggestion slug={slug} channels={channels} configured={aiConfigured} />}
          {showChecklist && (
            <section aria-labelledby="check-h" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
              <h2 id="check-h" className="text-h2">
                {t("checklist.title")}
              </h2>
              <ul className="flex flex-col gap-3">
                {checklist.map((item) => (
                  <li key={item.key} className="flex items-center gap-3">
                    {item.done ? <CircleCheck aria-hidden className="text-success" /> : <Circle aria-hidden className="text-text-muted" />}
                    <span className={cx("flex-1 text-body", item.done && "text-text-muted line-through")}>
                      {t(`checklist.${item.key}`)}
                      <span className="sr-only"> – {t(item.done ? "checklist.done" : "checklist.open")}</span>
                    </span>
                    {!item.done && item.href && (
                      <Link href={item.href} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                        {t("checklist.start")}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="act-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <h2 id="act-h" className="text-h2">
              {t("activity")}
            </h2>
            <ActivityList entries={data.activity} members={memberMap} postTitles={data.postTitles} slug={slug} />
          </section>
        </div>
      </div>
    </div>
  );
}
