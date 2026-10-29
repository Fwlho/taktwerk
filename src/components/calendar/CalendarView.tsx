"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { ChannelChip } from "@/components/domain/ChannelChip";
import { POST_STATUS_DOT } from "@/components/domain/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import { CALENDAR_VIEWS, isoWeek, monthGrid, postDay, shift, startOfMonth, weekDays, type CalendarView as View } from "@/lib/calendar";
import { POST_STATUSES, type ChannelType } from "@/lib/domain";
import { berlinLocalToIso, parseDateOnly, todayBerlin } from "@/lib/format";
import type { MemberRole } from "@/server/db/database.types";
import type { PostListRow } from "@/server/posts/queries";
import { movePost } from "@/server/posts/actions";
import { savePreference } from "@/server/preferences";
import type { ChannelOption } from "@/components/campaigns/CampaignFormModal";
import { NewPostModal, type CampaignOption } from "@/components/posts/NewPostModal";
import { PostCard, type MemberInfo } from "@/components/posts/PostCard";
import { CalendarEntry } from "./CalendarEntry";

const MAX_VISIBLE = 3;
const CHANNEL_DOT: Record<ChannelType, string> = {
  instagram: "bg-ch-instagram",
  facebook: "bg-ch-facebook",
  youtube: "bg-ch-youtube",
  linkedin: "bg-ch-linkedin",
  tiktok: "bg-ch-tiktok",
  offline: "bg-ch-offline",
};
const FIRST_HOUR = 7;
const LAST_HOUR = 20;
const HOUR_PX = 52;
const SLOT_MIN = 15;

type Placement = { planned_on: string; scheduled_at: string | null };

function DayCell({
  id,
  day,
  inMonth,
  isToday,
  isPast,
  canDrop,
  children,
  onAdd,
  addLabel,
}: {
  id: string;
  day: string;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  canDrop: boolean;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel: string;
}) {
  const t = useTranslations("calendar");
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !canDrop });
  return (
    <div
      ref={setNodeRef}
      className={cx(
        "group relative flex min-h-[120px] flex-col gap-1 border-r border-b border-border p-1.5",
        inMonth ? "bg-surface hover:bg-surface-hover" : "bg-surface-sunken",
        isOver && "bg-primary-soft shadow-[inset_0_0_0_2px_var(--color-primary)]",
        isPast && "[&_.group]:opacity-80",
      )}
    >
      <span
        className={cx(
          "size-6 rounded-full text-center text-small leading-6 font-semibold tabular-nums",
          isToday && "bg-primary text-on-primary",
          !inMonth && !isToday && "font-normal text-text-muted",
        )}
      >
        {parseDateOnly(day).getUTCDate()}
      </span>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel}
          className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded-sm bg-primary-soft text-primary opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Plus className="icon-sm" />
        </button>
      )}
      {children}
      {isOver && (
        <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-sm border-[1.5px] border-dashed border-primary p-1 text-center text-caption text-primary">
          {t("dropHere")}
        </span>
      )}
    </div>
  );
}

function Slot({ id, canDrop, onClick, label }: { id: string; canDrop: boolean; onClick?: () => void; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !canDrop });
  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      title={onClick ? label : undefined}
      aria-hidden
      className={cx("h-[13px]", onClick && "cursor-pointer hover:bg-surface-hover", isOver && "bg-primary-soft")}
    />
  );
}

export function CalendarView({
  slug,
  role,
  view,
  date,
  posts: initialPosts,
  channels,
  campaigns,
  members,
  initialHidden,
}: {
  slug: string;
  role: MemberRole;
  view: View;
  date: string;
  posts: PostListRow[];
  channels: ChannelOption[];
  campaigns: CampaignOption[];
  members: MemberInfo[];
  initialHidden: ChannelType[];
}) {
  const t = useTranslations("calendar");
  const ts = useTranslations("posts.status");
  const tc = useTranslations("channels.types");
  const te = useTranslations("errors");
  const format = useFormatter();
  const toast = useToast();
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [prevInitial, setPrevInitial] = useState(initialPosts);
  if (initialPosts !== prevInitial) {
    setPrevInitial(initialPosts);
    setPosts(initialPosts);
  }
  const [hidden, setHidden] = useState<ChannelType[]>(initialHidden);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ plannedOn: string; time?: string } | null>(null);
  const [dayList, setDayList] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(date);
  const today = todayBerlin();
  const canCreate = role === "owner" || role === "editor";
  const canMove = role === "owner" || role === "editor";
  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  // Kanalfilter pro Person merken
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => void savePreference(slug, "calendar.hidden", hidden), 500);
    return () => clearTimeout(id);
  }, [hidden, slug]);

  const visible = useMemo(() => posts.filter((p) => !p.channels || !hidden.includes(p.channels.type)), [posts, hidden]);
  const byDay = useMemo(() => {
    const m = new Map<string, PostListRow[]>();
    for (const p of visible) {
      const { day } = postDay(p);
      if (!day) continue;
      m.set(day, [...(m.get(day) ?? []), p]);
    }
    for (const list of m.values()) list.sort((a, b) => (postDay(a).time ?? "").localeCompare(postDay(b).time ?? ""));
    return m;
  }, [visible]);

  function go(nextView: View, nextDate: string) {
    if (nextView !== view) void savePreference(slug, "calendar.view", nextView);
    router.push(`/o/${slug}/calendar?view=${nextView}&date=${nextDate}`);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function applyPlacement(id: string, placement: Placement) {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, ...placement } : p)));
  }

  async function move(post: PostListRow, next: Placement, silent = false) {
    const before: Placement = { planned_on: post.planned_on ?? next.planned_on, scheduled_at: post.scheduled_at };
    if (post.status === "scheduled" && (!next.scheduled_at || new Date(next.scheduled_at) <= new Date())) {
      toast({ kind: "info", title: t("scheduledNeedsTime") });
      return;
    }
    applyPlacement(post.id, next);
    const res = await movePost(slug, post.id, next.planned_on, next.scheduled_at);
    if (res.error) {
      applyPlacement(post.id, before);
      toast({ kind: "error", title: te(res.error) });
      return;
    }
    if (!silent)
      toast({
        kind: "success",
        title: t("moved", { day: format.dateTime(parseDateOnly(next.planned_on), { weekday: "short", day: "numeric", month: "short" }) }),
        duration: 8000,
        action: { label: t("undo"), onClick: () => void move({ ...post, ...next }, before, true) },
      });
    router.refresh();
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const post = posts.find((p) => p.id === e.active.id);
    const over = e.over?.id as string | undefined;
    if (!post || !over) return;
    const { time } = postDay(post);
    if (over.startsWith("day:") || over.startsWith("allday:")) {
      const day = over.split(":")[1]!;
      const keepTime = over.startsWith("day:") && time;
      const next: Placement = { planned_on: day, scheduled_at: keepTime ? berlinLocalToIso(day, time) : null };
      if (day === postDay(post).day && (keepTime ? true : !post.scheduled_at)) return;
      void move(post, next);
    } else if (over.startsWith("slot:")) {
      const [, day, hhmm] = over.split("|");
      const next: Placement = { planned_on: day!, scheduled_at: berlinLocalToIso(day!, hhmm!) };
      if (next.scheduled_at === post.scheduled_at) return;
      void move(post, next);
    }
  }

  const draggable = (p: PostListRow) => canMove && p.status !== "published" && p.status !== "evaluated";
  const active = activeId ? posts.find((p) => p.id === activeId) : null;
  const weekdayNames = weekDays("2026-10-26").map((d) => format.dateTime(parseDateOnly(d), { weekday: "short" }));

  const title =
    view === "week"
      ? t("weekTitle", { week: isoWeek(date), range: `${format.dateTime(parseDateOnly(weekDays(date)[0]!), { day: "numeric", month: "short" })} – ${format.dateTime(parseDateOnly(weekDays(date)[6]!), { day: "numeric", month: "short", year: "numeric" })}` })
      : format.dateTime(parseDateOnly(startOfMonth(date)), { month: "long", year: "numeric" });

  const header = (
    <header className="mb-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label={t("viewLabel")} className="inline-flex gap-0.5 rounded-md bg-surface-sunken p-[3px]">
            {CALENDAR_VIEWS.map((v) => (
              <button
                key={v}
                role="tab"
                type="button"
                aria-selected={view === v}
                onClick={() => go(v, date)}
                className={cx("h-[34px] rounded-[8px] px-4 text-label", view === v ? "bg-surface shadow-sm" : "text-text-muted hover:text-text")}
              >
                {t(`views.${v}`)}
              </button>
            ))}
          </div>
          {canCreate && (
            <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => setCreating({ plannedOn: today })}>
              {t("newPost")}
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" iconOnly aria-label={t("prev")} icon={<ChevronLeft />} onClick={() => go(view, shift(view, date, -1))} />
          <Button size="sm" onClick={() => go(view, today)}>
            {t("today")}
          </Button>
          <Button size="sm" variant="ghost" iconOnly aria-label={t("next")} icon={<ChevronRight />} onClick={() => go(view, shift(view, date, 1))} />
        </div>
        <h2 className="text-h2" aria-live="polite">
          {title}
        </h2>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {channels.length > 1 ? (
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">{t("filter")}</legend>
            {channels.map((c) => {
              const on = !hidden.includes(c.type);
              return (
                <label key={c.id} className="cursor-pointer rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => setHidden((h) => (on ? [...h, c.type] : h.filter((x) => x !== c.type)))}
                  />
                  <ChannelChip type={c.type} label={tc(c.type)} state={on ? "selected" : "off"} />
                </label>
              );
            })}
          </fieldset>
        ) : (
          <span />
        )}
        <ul aria-label={t("legend")} className="hidden flex-wrap items-center gap-3 desktop:flex">
          {POST_STATUSES.map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5 text-caption font-normal text-text-muted">
              <span aria-hidden className={cx("size-2 rounded-full", POST_STATUS_DOT[s])} />
              {ts(s)}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );

  const empty = visible.length === 0;

  // ---------- Monat ----------
  const month = () => {
    const grid = monthGrid(date);
    const monthKey = date.slice(0, 7);
    return (
      <>
        <div className="relative hidden overflow-hidden rounded-lg border-t border-l border-border tablet:block">
          <div className="grid grid-cols-7">
            {weekdayNames.map((n) => (
              <div key={n} className="border-r border-b border-border bg-surface px-3 py-2 text-caption text-text-muted">
                {n}
              </div>
            ))}
            {grid.map((day) => {
              const list = byDay.get(day) ?? [];
              const extra = list.length - MAX_VISIBLE;
              return (
                <DayCell
                  key={day}
                  id={`day:${day}`}
                  day={day}
                  inMonth={day.startsWith(monthKey)}
                  isToday={day === today}
                  isPast={day < today}
                  canDrop={canMove}
                  onAdd={canCreate ? () => setCreating({ plannedOn: day }) : undefined}
                  addLabel={t("addOn", { day: format.dateTime(parseDateOnly(day), { day: "numeric", month: "long" }) })}
                >
                  {list.slice(0, MAX_VISIBLE).map((p) => (
                    <CalendarEntry key={p.id} slug={slug} post={p} draggable={draggable(p)} />
                  ))}
                  {extra > 0 && (
                    <button type="button" onClick={() => setDayList(day)} className="self-start px-1.5 py-0.5 text-caption text-primary hover:underline">
                      {t("more", { count: extra })}
                    </button>
                  )}
                </DayCell>
              );
            })}
          </div>
          {empty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto rounded-lg border border-border bg-surface shadow-md">
                <EmptyState kind="first-use" title={t("emptyTitle")} text={t("emptyText")} />
              </div>
            </div>
          )}
        </div>

        {/* Mobil: Punktansicht + Tagesliste */}
        <div className="tablet:hidden">
          <div className="grid grid-cols-7 gap-y-1 rounded-lg border border-border bg-surface p-2">
            {weekdayNames.map((n) => (
              <span key={n} className="text-center text-caption text-text-muted">
                {n.slice(0, 2)}
              </span>
            ))}
            {grid.map((day) => {
              const list = byDay.get(day) ?? [];
              const types = [...new Set(list.flatMap((p) => (p.channels ? [p.channels.type] : [])))].slice(0, 3);
              const inMonth = day.startsWith(monthKey);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  aria-pressed={selectedDay === day}
                  aria-label={t("dayWithCount", {
                    day: format.dateTime(parseDateOnly(day), { day: "numeric", month: "long" }),
                    count: list.length,
                  })}
                  className={cx(
                    "flex h-11 flex-col items-center justify-center gap-1 rounded-md",
                    selectedDay === day && "bg-primary-soft",
                    !inMonth && day !== today && "text-text-muted",
                  )}
                >
                  <span className={cx("size-6 rounded-full text-small leading-6 tabular-nums", day === today && "bg-primary text-on-primary")}>
                    {parseDateOnly(day).getUTCDate()}
                  </span>
                  <span className="flex h-1.5 gap-0.5">
                    {types.map((ty) => (
                      <i key={ty} className={cx("block size-1.5 rounded-full", CHANNEL_DOT[ty])} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <h3 className="mt-4 mb-2 text-h3">{format.dateTime(parseDateOnly(selectedDay), { weekday: "long", day: "numeric", month: "long" })}</h3>
          <ul className="flex flex-col gap-3">
            {(byDay.get(selectedDay) ?? []).length === 0 && (
              <li className="flex flex-col items-start gap-2 text-body text-text-muted">
                {t("nothingThatDay")}
                {canCreate && (
                  <Button variant="ghost" icon={<Plus aria-hidden />} onClick={() => setCreating({ plannedOn: selectedDay })}>
                    {t("newPost")}
                  </Button>
                )}
              </li>
            )}
            {(byDay.get(selectedDay) ?? []).map((p) => (
              <li key={p.id}>
                <PostCard slug={slug} post={p} members={memberMap} />
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  };

  // ---------- Woche ----------
  const week = () => {
    const days = weekDays(date);
    const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
    const nowLocal = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    const [nh, nm] = nowLocal.split(":").map(Number);
    const nowTop = ((nh! - FIRST_HOUR) * 60 + nm!) * (HOUR_PX / 60);
    return (
      <div className="-mx-4 overflow-x-auto px-4 tablet:mx-0 tablet:px-0">
        <div className="min-w-[760px] overflow-hidden rounded-lg border border-border bg-surface">
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-border">
            <span />
            {days.map((d) => (
              <div key={d} className={cx("border-l border-border px-2 py-2 text-center", d === today && "bg-primary-soft")}>
                <span className="block text-caption text-text-muted">{format.dateTime(parseDateOnly(d), { weekday: "short" })}</span>
                <span className={cx("text-h3 tabular-nums", d === today && "text-primary")}>{parseDateOnly(d).getUTCDate()}</span>
              </div>
            ))}
          </div>
          {/* Ganztägig: Beiträge ohne Uhrzeit, z. B. Offline-Maßnahmen */}
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-border">
            <span className="px-1 py-2 text-caption leading-4 text-text-muted">{t("allDay")}</span>
            {days.map((d) => (
              <AllDay key={d} id={`allday:${d}`} canDrop={canMove}>
                {(byDay.get(d) ?? [])
                  .filter((p) => !postDay(p).time)
                  .map((p) => (
                    <CalendarEntry key={p.id} slug={slug} post={p} draggable={draggable(p)} />
                  ))}
              </AllDay>
            ))}
          </div>
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
            <div>
              {hours.map((h) => (
                <div key={h} className="h-[52px] pr-2 text-right text-caption font-normal text-text-muted tabular-nums">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {days.map((d) => {
              const timed = (byDay.get(d) ?? []).filter((p) => postDay(p).time);
              return (
                <div key={d} className={cx("relative border-l border-border", d === today && "bg-primary-soft/40")}>
                  {hours.map((h) => (
                    <div key={h} className="border-b border-border">
                      {Array.from({ length: 60 / SLOT_MIN }, (_, q) => {
                        const hhmm = `${String(h).padStart(2, "0")}:${String(q * SLOT_MIN).padStart(2, "0")}`;
                        return (
                          <Slot
                            key={q}
                            id={`slot:|${d}|${hhmm}`}
                            canDrop={canMove}
                            label={t("addAt", { time: hhmm })}
                            onClick={canCreate ? () => setCreating({ plannedOn: d, time: hhmm }) : undefined}
                          />
                        );
                      })}
                    </div>
                  ))}
                  {timed.map((p) => {
                    const [hh, mm] = postDay(p).time!.split(":").map(Number);
                    const minutes = Math.min(Math.max((hh! - FIRST_HOUR) * 60 + mm!, 0), (LAST_HOUR - FIRST_HOUR) * 60 - 44);
                    return (
                      <CalendarEntry
                        key={p.id}
                        slug={slug}
                        post={p}
                        variant="block"
                        draggable={draggable(p)}
                        style={{ position: "absolute", top: minutes * (HOUR_PX / 60), left: 2, right: 2 }}
                      />
                    );
                  })}
                  {d === today && nowTop >= 0 && nowTop <= (LAST_HOUR - FIRST_HOUR) * HOUR_PX && (
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 h-0.5 bg-danger" style={{ top: nowTop }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ---------- Liste ----------
  const list = () => {
    const days = [...byDay.keys()].filter((d) => d.startsWith(date.slice(0, 7))).sort();
    if (days.length === 0)
      return (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState kind="first-use" title={t("emptyTitle")} text={t("emptyText")} />
        </div>
      );
    return (
      <div className="flex flex-col gap-6">
        {days.map((d) => (
          <section key={d} className="flex flex-col gap-3">
            <h3 className={cx("text-h3", d === today && "text-primary")}>
              {format.dateTime(parseDateOnly(d), { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <ul className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
              {byDay.get(d)!.map((p) => (
                <li key={p.id}>
                  <PostCard slug={slug} post={p} members={memberMap} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  };

  return (
    <>
      {header}
      <DndContext
        id="calendar-dnd"
        sensors={sensors}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          screenReaderInstructions: { draggable: t("dragInstructions") },
          announcements: {
            onDragStart: () => t("dragStart"),
            onDragOver: ({ over }) => (over ? t("dragOver") : t("dragNone")),
            onDragEnd: ({ over }) => (over ? t("dragEnd") : t("dragCancel")),
            onDragCancel: () => t("dragCancel"),
          },
        }}
      >
        {view === "month" ? month() : view === "week" ? week() : list()}
        <DragOverlay>{active ? <CalendarEntry slug={slug} post={active} draggable={false} overlay /> : null}</DragOverlay>
      </DndContext>

      <Modal
        open={dayList !== null}
        onClose={() => setDayList(null)}
        title={dayList ? format.dateTime(parseDateOnly(dayList), { weekday: "long", day: "numeric", month: "long" }) : ""}
      >
        <ul className="flex flex-col gap-1.5">
          {(dayList ? (byDay.get(dayList) ?? []) : []).map((p) => (
            <li key={p.id}>
              <CalendarEntry slug={slug} post={p} draggable={false} />
            </li>
          ))}
        </ul>
      </Modal>

      {canCreate && (
        <NewPostModal
          slug={slug}
          open={creating !== null}
          onClose={() => setCreating(null)}
          channels={channels}
          campaigns={campaigns}
          defaults={{ plannedOn: creating?.plannedOn ?? "", time: creating?.time ?? "" }}
        />
      )}
    </>
  );
}

function AllDay({ id, canDrop, children }: { id: string; canDrop: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !canDrop });
  return (
    <div ref={setNodeRef} className={cx("flex min-h-10 flex-col gap-1 border-l border-border p-1", isOver && "bg-primary-soft")}>
      {children}
    </div>
  );
}
