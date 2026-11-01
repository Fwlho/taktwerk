"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cx } from "@/lib/cx";
import type { PostStatus } from "@/lib/domain";
import { allowedTargets, SYSTEM_STATUSES } from "@/lib/post-transitions";
import type { MemberRole } from "@/server/db/database.types";
import type { PostListRow } from "@/server/posts/queries";
import { savePreference } from "@/server/preferences";
import type { ChannelOption } from "@/components/campaigns/CampaignFormModal";
import { IdeasModal } from "@/components/ai/IdeasModal";
import { NewPostModal, type CampaignOption } from "./NewPostModal";
import { PostCard, type MemberInfo } from "./PostCard";
import { applyPostFilter, type PostFilterState } from "@/lib/post-filter";
import { PostFilters } from "./PostFilters";
import { usePostTransition } from "./usePostTransition";

// Spaltenreihenfolge: „Änderung gewünscht“ direkt nach „Zur Freigabe“
const COLUMNS: PostStatus[] = ["idea", "draft", "in_review", "changes_requested", "approved", "scheduled", "published", "evaluated"];

/** Tastatur: Pfeil links/rechts springt eine Spalte weiter */
const columnCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const { active, droppableRects, droppableContainers, collisionRect } = context;
  if (!active || !collisionRect) return undefined;
  const dir = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
  if (!dir) return undefined;
  event.preventDefault();
  const columns = droppableContainers
    .getEnabled()
    .map((c) => ({ id: c.id, rect: droppableRects.get(c.id) }))
    .filter((c): c is { id: string; rect: NonNullable<typeof c.rect> } => !!c.rect)
    .sort((a, b) => a.rect.left - b.rect.left);
  const center = collisionRect.left + collisionRect.width / 2;
  const current = columns.findIndex((c) => center >= c.rect.left && center <= c.rect.left + c.rect.width);
  const next = columns[Math.min(Math.max((current === -1 ? 0 : current) + dir, 0), columns.length - 1)];
  if (!next) return undefined;
  return { x: next.rect.left + 12, y: Math.max(next.rect.top + 60, collisionRect.top) };
};

function DraggableCard({ id, disabled, children }: { id: string; disabled: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cx("touch-manipulation", isDragging && "opacity-40")}>
      {children}
    </div>
  );
}

function Column({
  status,
  count,
  dropState,
  children,
  onAdd,
}: {
  status: PostStatus;
  count: number;
  dropState: "idle" | "allowed" | "blocked";
  children: React.ReactNode;
  onAdd?: () => void;
}) {
  const t = useTranslations("posts.pipeline");
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: dropState === "blocked" });
  return (
    <section
      ref={setNodeRef}
      aria-label={t("column", { status })}
      className={cx(
        "flex w-[272px] flex-none flex-col gap-3 rounded-lg bg-surface-sunken p-3 transition-colors duration-(--duration-fast)",
        dropState === "allowed" && isOver && "bg-primary-soft shadow-[inset_0_0_0_2px_var(--color-primary)]",
        dropState === "blocked" && "cursor-not-allowed opacity-60",
      )}
    >
      <header className="flex items-center gap-2 px-1 pt-1">
        <StatusBadge status={status} />
        <span className="rounded-full bg-surface px-2 text-caption leading-5 text-text-muted tabular-nums">{count}</span>
      </header>
      {children}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-10 items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-border-strong text-label text-text-muted hover:bg-surface hover:text-text"
        >
          <Plus aria-hidden className="icon-sm" />
          {t("add")}
        </button>
      )}
    </section>
  );
}

export function PipelineBoard({
  slug,
  role,
  posts: initialPosts,
  members,
  channels,
  campaigns,
  initialFilter,
}: {
  slug: string;
  role: MemberRole;
  posts: PostListRow[];
  members: MemberInfo[];
  channels: ChannelOption[];
  campaigns: CampaignOption[];
  initialFilter: PostFilterState;
}) {
  const t = useTranslations("posts.pipeline");
  const ts = useTranslations("posts.status");
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [filter, setFilter] = useState<PostFilterState>(initialFilter);
  const [active, setActive] = useState<PostListRow | null>(null);
  const [creating, setCreating] = useState<PostStatus | null>(null);
  const [mobileTab, setMobileTab] = useState<PostStatus>("draft");
  const [ideasOpen, setIdeasOpen] = useState(false);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);
  const canCreate = role === "owner" || role === "editor";
  const canDrag = role !== "viewer";

  // Neue Serverdaten übernehmen (nach router.refresh)
  const [prevInitial, setPrevInitial] = useState(initialPosts);
  if (initialPosts !== prevInitial) {
    setPrevInitial(initialPosts);
    setPosts(initialPosts);
  }

  // Filter pro Person merken (verzögert speichern)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => void savePreference(slug, "pipeline.filter", filter), 600);
    return () => clearTimeout(id);
  }, [filter, slug]);

  const { run, dialogs } = usePostTransition({
    slug,
    role,
    onOptimistic: (id, to) => {
      let previous: PostStatus | undefined;
      setPosts((ps) => ps.map((p) => (p.id === id ? ((previous = p.status), { ...p, status: to }) : p)));
      return () => setPosts((ps) => ps.map((p) => (p.id === id && previous ? { ...p, status: previous } : p)));
    },
    onDone: () => router.refresh(),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates }),
  );

  const visible = useMemo(() => applyPostFilter(posts, filter), [posts, filter]);
  const byStatus = useMemo(() => {
    const m = new Map<PostStatus, PostListRow[]>(COLUMNS.map((s) => [s, []]));
    for (const p of visible) m.get(p.status)?.push(p);
    return m;
  }, [visible]);

  const targets = active ? new Set(allowedTargets(role, active.status)) : null;

  function onDragStart(e: DragStartEvent) {
    setActive(posts.find((p) => p.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    const post = posts.find((p) => p.id === e.active.id);
    setActive(null);
    const to = e.over?.id as PostStatus | undefined;
    if (!post || !to || to === post.status) return;
    run(post, to);
  }

  const filterBar = (
    <PostFilters
      value={filter}
      onChange={setFilter}
      channels={channels}
      campaigns={campaigns}
      members={members}
      showPerson={role !== "external"}
    />
  );

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">{t("title")}</h1>
          <p className="text-body text-text-muted">{t("intro")}</p>
        </div>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ai" icon={<Sparkles aria-hidden />} onClick={() => setIdeasOpen(true)}>
              {t("suggestIdeas")}
            </Button>
            <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => setCreating("draft")}>
              {t("newPost")}
            </Button>
          </div>
        )}
      </header>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState
            kind="first-use"
            title={t("emptyTitle")}
            text={role === "external" ? t("emptyExternal") : t("emptyText")}
            actions={
              canCreate && (
                <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => setCreating("draft")}>
                  {t("newPost")}
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <div className="mb-4">{filterBar}</div>

          {/* Desktop/Tablet: Kanban */}
          <DndContext
            id="pipeline-dnd"
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActive(null)}
            accessibility={{
              screenReaderInstructions: { draggable: t("dragInstructions") },
              announcements: {
                onDragStart: () => t("dragStart"),
                onDragOver: ({ over }) => (over ? t("dragOver", { status: ts(over.id as PostStatus) }) : t("dragNone")),
                onDragEnd: ({ over }) => (over ? t("dragEnd", { status: ts(over.id as PostStatus) }) : t("dragCancel")),
                onDragCancel: () => t("dragCancel"),
              },
            }}
          >
            <div className="-mx-4 hidden overflow-x-auto px-4 pb-4 tablet:-mx-8 tablet:block tablet:px-8">
              <div className="flex items-start gap-4">
                {COLUMNS.map((status) => {
                  const list = byStatus.get(status) ?? [];
                  const dropState: "idle" | "allowed" | "blocked" = !active
                    ? "idle"
                    : status === active.status || targets?.has(status)
                      ? "allowed"
                      : "blocked";
                  return (
                    <Column
                      key={status}
                      status={status}
                      count={list.length}
                      dropState={dropState}
                      onAdd={canCreate && (status === "idea" || status === "draft") ? () => setCreating(status) : undefined}
                    >
                      {list.length === 0 ? (
                        <p className="px-3 py-6 text-center text-small text-text-muted">{t(`empty.${status}`)}</p>
                      ) : (
                        list.map((post) => (
                          <DraggableCard
                            key={post.id}
                            id={post.id}
                            disabled={!canDrag || SYSTEM_STATUSES.includes(post.status)}
                          >
                            <PostCard slug={slug} post={post} members={memberMap} showStatus={false} />
                          </DraggableCard>
                        ))
                      )}
                    </Column>
                  );
                })}
              </div>
            </div>
            <DragOverlay>{active ? <PostCard slug={slug} post={active} members={memberMap} showStatus={false} dragging /> : null}</DragOverlay>
          </DndContext>

          {/* Mobil: Status-Tabs + Liste, Verschieben über „Status ändern“ */}
          <div className="tablet:hidden">
            <div role="tablist" aria-label={t("statusTabs")} className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
              {COLUMNS.map((s) => (
                <button
                  key={s}
                  role="tab"
                  type="button"
                  aria-selected={mobileTab === s}
                  onClick={() => setMobileTab(s)}
                  className={cx(
                    "flex-none rounded-full border px-3 py-1.5 text-small font-semibold whitespace-nowrap",
                    mobileTab === s ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-text-muted",
                  )}
                >
                  {ts(s)} · {byStatus.get(s)?.length ?? 0}
                </button>
              ))}
            </div>
            <ul className="flex flex-col gap-3">
              {(byStatus.get(mobileTab) ?? []).length === 0 && (
                <li className="py-8 text-center text-small text-text-muted">{t(`empty.${mobileTab}`)}</li>
              )}
              {(byStatus.get(mobileTab) ?? []).map((post) => {
                const options = allowedTargets(role, post.status);
                return (
                  <li key={post.id} className="flex flex-col gap-2">
                    <PostCard slug={slug} post={post} members={memberMap} />
                    {options.length > 0 && (
                      <label className="flex items-center gap-2 self-end">
                        <span className="text-small text-text-muted">{t("changeStatus")}</span>
                        <select
                          value=""
                          onChange={(e) => e.target.value && run(post, e.target.value as PostStatus)}
                          className="h-(--size-control) rounded-md border border-border-strong bg-surface px-3 text-label"
                        >
                          <option value="">{t("choose")}</option>
                          {options.map((o) => (
                            <option key={o} value={o}>
                              {ts(o)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {dialogs}
      {canCreate && (
        <NewPostModal
          slug={slug}
          open={creating !== null}
          onClose={() => setCreating(null)}
          channels={channels}
          campaigns={campaigns}
          defaults={{ status: creating === "idea" ? "idea" : "draft" }}
        />
      )}
      {canCreate && <IdeasModal slug={slug} open={ideasOpen} onClose={() => setIdeasOpen(false)} channels={channels} />}
    </>
  );
}

