"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, ChevronLeft, ChevronRight, Copy, LayoutTemplate, MessageSquareText, Plus, Send, Sparkles } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ChannelChip, ChannelMono } from "@/components/domain/ChannelChip";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Banner } from "@/components/ui/Banner";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { addDays, isoWeek, postDay } from "@/lib/calendar";
import { cx } from "@/lib/cx";
import type { PostStatus } from "@/lib/domain";
import { parseDateOnly, todayBerlin } from "@/lib/format";
import { DAY_STATE_DOT, dayState, progress } from "@/lib/week";
import type { MemberRole } from "@/server/db/database.types";
import { createPost } from "@/server/posts/actions";
import { savePreference } from "@/server/preferences";
import { approveWeek, copyPreviousWeek, submitWeek } from "@/server/week/actions";
import type { WeekData, WeekPost } from "@/server/week/queries";
import type { ChannelOption } from "@/components/campaigns/CampaignFormModal";
import type { MemberInfo } from "@/components/posts/PostCard";
import { IdeasModal } from "@/components/ai/IdeasModal";
import { WeekTemplatesModal } from "./WeekTemplatesModal";

export type WeekView = "platform" | "day";

/** Ein Beitrag als Zeile im Wochenplan */
function PostRow({ slug, post, showChannel }: { slug: string; post: WeekPost; showChannel?: boolean }) {
  const t = useTranslations("week");
  const { time } = postDay(post);
  return (
    <li>
      <Link
        href={`/o/${slug}/posts/${post.id}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-surface px-3 py-2 hover:border-border-strong hover:shadow-sm"
      >
        {showChannel && post.channels && <ChannelMono type={post.channels.type} size="sm" />}
        <span className="w-12 flex-none text-small text-text-muted tabular-nums">{time ?? "–"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label">{post.title || t("untitled")}</span>
          {post.internal_notes && <span className="block truncate text-small text-text-muted">{post.internal_notes}</span>}
        </span>
        {post.promptCount > 0 && (
          <span className="inline-flex items-center gap-1 text-caption text-ai" title={t("prompts", { count: post.promptCount })}>
            <Sparkles aria-hidden className="size-3.5" />
            {post.promptCount}
            <span className="sr-only">{t("prompts", { count: post.promptCount })}</span>
          </span>
        )}
        {post.comments[0]?.count ? (
          <span className="inline-flex items-center gap-1 text-caption text-text-muted">
            <MessageSquareText aria-hidden className="size-3.5" />
            {post.comments[0].count}
          </span>
        ) : null}
        <StatusBadge status={post.status} />
      </Link>
    </li>
  );
}

/** Schnell anlegen: Titel tippen, Enter – Beitrag entsteht als Idee an diesem Tag auf dieser Plattform */
function QuickAdd({ slug, channelId, day, label }: { slug: string; channelId: string; day: string; label: string }) {
  const t = useTranslations("week");
  const te = useTranslations("errors");
  const toast = useToast();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const res = await createPost(slug, { channelId, title: title.trim(), campaignId: "", plannedOn: day, time: "", status: "idea" });
          if (res.error) return toast({ kind: "error", title: te(res.error) });
          setTitle("");
          router.refresh();
        });
      }}
      className="flex items-center gap-2"
    >
      <label className="relative flex flex-1 items-center">
        <span className="sr-only">{label}</span>
        <Plus aria-hidden className="pointer-events-none absolute left-3 text-text-muted icon-sm" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("quickAdd")}
          disabled={pending}
          className="h-10 w-full rounded-md border border-dashed border-border-strong bg-transparent pr-3 pl-9 text-body hover:border-text focus-visible:border-solid focus-visible:border-focus"
        />
      </label>
      {title.trim() && (
        <Button type="submit" size="sm" variant="primary" loading={pending}>
          {t("add")}
        </Button>
      )}
    </form>
  );
}

function DayDot({ statuses, label }: { statuses: PostStatus[]; label: string }) {
  const state = dayState(statuses);
  return <span role="img" aria-label={label} title={label} className={cx("inline-block size-2.5 flex-none rounded-full", DAY_STATE_DOT[state])} />;
}

function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-2 w-24 overflow-hidden rounded-full bg-surface-sunken"
      >
        <i className="block h-full rounded-full bg-status-approved" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </span>
      <span className="text-small text-text-muted tabular-nums">{label}</span>
    </span>
  );
}

export function WeekPlanner({
  slug,
  role,
  weekStart,
  view: initialView,
  data,
  channels,
  members,
}: {
  slug: string;
  role: MemberRole;
  weekStart: string;
  view: WeekView;
  data: WeekData;
  channels: ChannelOption[];
  members: MemberInfo[];
}) {
  const t = useTranslations("week");
  const tc = useTranslations("channels.types");
  const te = useTranslations("errors");
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const [view, setView] = useState<WeekView>(initialView);
  const [pending, startTransition] = useTransition();
  const [submitFor, setSubmitFor] = useState<{ channelId?: string } | null>(null);
  const [message, setMessage] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const today = todayBerlin();
  const canPlan = role === "owner" || role === "editor";
  const canSubmit = role !== "viewer";
  const names = new Map(members.map((m) => [m.userId, m.fullName]));
  const base = `/o/${slug}`;

  const byChannelDay = new Map<string, WeekPost[]>();
  for (const p of data.posts) {
    const { day } = postDay(p);
    if (!day) continue;
    const key = `${p.channel_id}|${day}`;
    byChannelDay.set(key, [...(byChannelDay.get(key) ?? []), p]);
  }
  for (const list of byChannelDay.values()) list.sort((a, b) => (postDay(a).time ?? "99").localeCompare(postDay(b).time ?? "99"));
  const postsOf = (channelId: string, day: string) => byChannelDay.get(`${channelId}|${day}`) ?? [];
  const dayLabel = (day: string) => format.dateTime(parseDateOnly(day), { weekday: "long", day: "numeric", month: "short" });
  const submittable = (posts: WeekPost[]) => posts.filter((p) => ["idea", "draft", "changes_requested"].includes(p.status)).length;
  const stateLabel = (statuses: PostStatus[]) => t(`dayState.${dayState(statuses)}`);

  function go(date: string) {
    router.push(`${base}/week?date=${date}`);
  }
  function switchView(v: WeekView) {
    setView(v);
    void savePreference(slug, "week.view", v);
  }

  function copyWeek() {
    startTransition(async () => {
      const res = await copyPreviousWeek(slug, weekStart);
      if (res.error) return toast({ kind: "error", title: te(res.error) });
      toast({ kind: res.data!.count ? "success" : "info", title: res.data!.count ? t("copied", { count: res.data!.count }) : t("nothingToCopy") });
      router.refresh();
    });
  }

  function doSubmit() {
    startTransition(async () => {
      const res = await submitWeek(slug, weekStart, submitFor?.channelId, message);
      if (res.error) return toast({ kind: "error", title: res.error === "nothingToSubmit" ? t("nothingToSubmit") : te(res.error) });
      toast({ kind: "success", title: t("submitted") });
      setSubmitFor(null);
      setMessage("");
      router.refresh();
    });
  }

  function doApprove(requestId: string) {
    startTransition(async () => {
      const res = await approveWeek(slug, requestId);
      if (res.error) return toast({ kind: "error", title: te(res.error) });
      toast({ kind: "success", title: t("approvedAll", { count: res.data!.count }) });
      router.refresh();
    });
  }

  const allSubmittable = submittable(data.posts);
  const totalProgress = progress(data.posts.map((p) => p.status));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">{t("title")}</h1>
            <p className="text-body text-text-muted">{t("intro")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canPlan && (
              <>
                <Button icon={<Copy aria-hidden />} onClick={copyWeek} loading={pending}>
                  {t("copyPrevious")}
                </Button>
                <Button icon={<LayoutTemplate aria-hidden />} onClick={() => setTemplatesOpen(true)}>
                  {t("templates")}
                </Button>
                <Button variant="ai" icon={<Sparkles aria-hidden />} onClick={() => setIdeasOpen(true)}>
                  {t("suggestIdeas")}
                </Button>
              </>
            )}
            {canSubmit && role !== "owner" && allSubmittable > 0 && (
              <Button variant="primary" icon={<Send aria-hidden />} onClick={() => setSubmitFor({})}>
                {t("submitWeek")}
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" iconOnly aria-label={t("prev")} icon={<ChevronLeft />} onClick={() => go(addDays(weekStart, -7))} />
            <Button size="sm" onClick={() => go(today)}>
              {t("thisWeek")}
            </Button>
            <Button size="sm" variant="ghost" iconOnly aria-label={t("next")} icon={<ChevronRight />} onClick={() => go(addDays(weekStart, 7))} />
            <h2 className="ml-2 text-h2" aria-live="polite">
              {t("weekLabel", {
                week: isoWeek(weekStart),
                range: `${format.dateTime(parseDateOnly(weekStart), { day: "numeric", month: "short" })} – ${format.dateTime(parseDateOnly(addDays(weekStart, 6)), { day: "numeric", month: "short" })}`,
              })}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {totalProgress.total > 0 && (
              <ProgressBar done={totalProgress.done} total={totalProgress.total} label={t("progress", { done: totalProgress.done, total: totalProgress.total })} />
            )}
            <div role="tablist" aria-label={t("viewLabel")} className="inline-flex gap-0.5 rounded-md bg-surface-sunken p-[3px]">
              {(["platform", "day"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  type="button"
                  aria-selected={view === v}
                  onClick={() => switchView(v)}
                  className={cx("h-[34px] rounded-[8px] px-4 text-label", view === v ? "bg-surface shadow-sm" : "text-text-muted hover:text-text")}
                >
                  {t(`views.${v}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Eingereichte Wochen */}
      {data.requests.map((r) => {
        const open = data.posts.filter((p) => r.postIds.includes(p.id) && p.status === "in_review").length;
        if (open === 0) return null;
        return (
          <Banner
            key={r.id}
            kind="warning"
            icon={<CalendarCheck aria-hidden />}
            action={
              role === "owner" ? (
                <span className="flex flex-wrap gap-2">
                  <Link href={`${base}/approvals/review`} className={buttonClasses({ size: "sm" })}>
                    {t("reviewSingle")}
                  </Link>
                  <Button size="sm" variant="primary" loading={pending} onClick={() => doApprove(r.id)}>
                    {t("approveAll", { count: open })}
                  </Button>
                </span>
              ) : undefined
            }
          >
            {t("requestBanner", {
              name: (r.requested_by && names.get(r.requested_by)) || t("someone"),
              count: open,
              channel: r.channel_id ? tc(channels.find((c) => c.id === r.channel_id)?.type ?? "offline") : t("allPlatforms"),
            })}
            {r.message && <span className="block text-text-muted">„{r.message}“</span>}
          </Banner>
        );
      })}

      {channels.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            kind="first-use"
            title={t("noChannelsTitle")}
            text={t("noChannelsText")}
            actions={
              canPlan && (
                <Link href={`${base}/channels`} className={buttonClasses({ variant: "primary" })}>
                  {t("toChannels")}
                </Link>
              )
            }
          />
        </div>
      ) : view === "platform" ? (
        /* Woche → Plattform → Tag → Beiträge */
        <div className="flex flex-col gap-4">
          {channels.map((c) => {
            const posts = data.posts.filter((p) => p.channel_id === c.id);
            const pr = progress(posts.map((p) => p.status));
            const open = submittable(posts);
            return (
              <details key={c.id} open className="group/platform rounded-lg border border-border bg-surface">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <ChevronRight aria-hidden className="text-text-muted transition-transform group-open/platform:rotate-90" />
                  <ChannelChip type={c.type} label={tc(c.type)} />
                  <span className="text-small text-text-muted">{t("postCount", { count: posts.length })}</span>
                  <span className="flex items-center gap-1" aria-hidden>
                    {data.days.map((d) => (
                      <DayDot key={d} statuses={postsOf(c.id, d).map((p) => p.status)} label="" />
                    ))}
                  </span>
                  <span className="ml-auto">
                    {pr.total > 0 && <ProgressBar done={pr.done} total={pr.total} label={t("progress", { done: pr.done, total: pr.total })} />}
                  </span>
                </summary>
                <div className="flex flex-col gap-2 border-t border-border p-4">
                  {data.days.map((day) => {
                    const list = postsOf(c.id, day);
                    return (
                      <details key={day} open={list.length > 0 || posts.length === 0} className="group/day rounded-md">
                        <summary
                          className={cx(
                            "flex cursor-pointer list-none items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-hover [&::-webkit-details-marker]:hidden",
                            day === today && "bg-primary-soft",
                          )}
                        >
                          <ChevronRight aria-hidden className="icon-sm text-text-muted transition-transform group-open/day:rotate-90" />
                          <DayDot statuses={list.map((p) => p.status)} label={stateLabel(list.map((p) => p.status))} />
                          <span className={cx("text-label", day === today && "text-primary")}>
                            {dayLabel(day)}
                            {day === today && <> · {t("today")}</>}
                          </span>
                          <span className="text-small text-text-muted">{list.length > 0 ? t("postCount", { count: list.length }) : t("free")}</span>
                        </summary>
                        <div className="flex flex-col gap-2 py-2 pl-9">
                          {list.length > 0 && (
                            <ul className="flex flex-col gap-2">
                              {list.map((p) => (
                                <PostRow key={p.id} slug={slug} post={p} />
                              ))}
                            </ul>
                          )}
                          {canPlan && <QuickAdd slug={slug} channelId={c.id} day={day} label={t("quickAddFor", { channel: tc(c.type), day: dayLabel(day) })} />}
                        </div>
                      </details>
                    );
                  })}
                  {canSubmit && role !== "owner" && open > 0 && (
                    <Button icon={<Send aria-hidden />} onClick={() => setSubmitFor({ channelId: c.id })} className="self-start">
                      {t("submitPlatform", { channel: tc(c.type), count: open })}
                    </Button>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        /* Woche → Tag → Plattform → Beiträge */
        <div className="flex flex-col gap-4">
          {data.days.map((day) => {
            const dayPosts = data.posts.filter((p) => postDay(p).day === day);
            return (
              <details key={day} open={dayPosts.length > 0 || day === today} className="group/day rounded-lg border border-border bg-surface">
                <summary
                  className={cx(
                    "flex cursor-pointer list-none flex-wrap items-center gap-3 rounded-t-lg p-4 [&::-webkit-details-marker]:hidden",
                    day === today && "bg-primary-soft",
                  )}
                >
                  <ChevronRight aria-hidden className="text-text-muted transition-transform group-open/day:rotate-90" />
                  <DayDot statuses={dayPosts.map((p) => p.status)} label={stateLabel(dayPosts.map((p) => p.status))} />
                  <span className={cx("text-h3", day === today && "text-primary")}>
                    {dayLabel(day)}
                    {day === today && <> · {t("today")}</>}
                  </span>
                  <span className="text-small text-text-muted">{dayPosts.length ? t("postCount", { count: dayPosts.length }) : t("free")}</span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-border p-4">
                  {channels.map((c) => {
                    const list = postsOf(c.id, day);
                    return (
                      <div key={c.id} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <ChannelChip type={c.type} label={tc(c.type)} compact />
                          {list.length > 0 && <DayDot statuses={list.map((p) => p.status)} label={stateLabel(list.map((p) => p.status))} />}
                        </div>
                        {list.length > 0 && (
                          <ul className="flex flex-col gap-2 pl-2">
                            {list.map((p) => (
                              <PostRow key={p.id} slug={slug} post={p} />
                            ))}
                          </ul>
                        )}
                        {canPlan && (
                          <div className="pl-2">
                            <QuickAdd slug={slug} channelId={c.id} day={day} label={t("quickAddFor", { channel: tc(c.type), day: dayLabel(day) })} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      )}

      <Modal
        open={submitFor !== null}
        onClose={() => setSubmitFor(null)}
        busy={pending}
        icon={<Send />}
        title={submitFor?.channelId ? t("submitPlatformTitle", { channel: tc(channels.find((c) => c.id === submitFor.channelId)?.type ?? "offline") }) : t("submitWeekTitle")}
        subtitle={t("submitSubtitle", {
          count: submitFor?.channelId ? submittable(data.posts.filter((p) => p.channel_id === submitFor.channelId)) : allSubmittable,
        })}
        footer={
          <>
            <Button onClick={() => setSubmitFor(null)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button variant="primary" loading={pending} onClick={doSubmit}>
              {t("submit")}
            </Button>
          </>
        }
      >
        <TextArea label={t("message")} optional placeholder={t("messagePlaceholder")} value={message} onChange={(e) => setMessage(e.target.value)} data-autofocus />
      </Modal>

      {canPlan && <WeekTemplatesModal slug={slug} open={templatesOpen} onClose={() => setTemplatesOpen(false)} weekStart={weekStart} weekHasPosts={data.posts.length > 0} />}
      {canPlan && (
        <IdeasModal
          slug={slug}
          open={ideasOpen}
          onClose={() => setIdeasOpen(false)}
          channels={channels}
          subtitle={t("ideasSubtitle")}
          // Mo, Mi, Fr, Di, Do, Sa, So
          plannedOn={(i) => addDays(weekStart, [0, 2, 4, 1, 3, 5, 6][i % 7]!)}
        />
      )}
    </div>
  );
}
