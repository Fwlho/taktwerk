"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, CloudOff, Copy, Check, ExternalLink, Rocket, Send, Sparkles, Trash2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelChip, ChannelMono } from "@/components/domain/ChannelChip";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Banner } from "@/components/ui/Banner";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { TextArea, TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import { CHANNEL_TEXT_LIMITS, type PostStatus } from "@/lib/domain";
import { berlinLocalToIso, formatDateTime, isoToBerlinLocal } from "@/lib/format";
import { canTransition, statusStep } from "@/lib/post-transitions";
import type { MemberRole } from "@/server/db/database.types";
import { deletePost, savePostContent, setAssignees, transferPost, transitionPost } from "@/server/posts/actions";
import { adaptTransferred, type AiStatus } from "@/server/ai/actions";
import { publishNow } from "@/server/publishing/actions";
import { parsePublishError } from "@/lib/publishing";
import { AssistantPanel } from "@/components/ai/AssistantPanel";
import type { PostDetail, PostThread as Thread } from "@/server/posts/queries";
import type { ChannelOption } from "@/components/campaigns/CampaignFormModal";
import { PostMedia } from "@/components/assets/PostMedia";
import type { AssetItem } from "@/server/assets/queries";
import { ActivityList } from "./ActivityList";
import type { CampaignOption } from "./NewPostModal";
import type { MemberInfo } from "./PostCard";
import { PostPreview } from "./PostPreview";
import { PostThread } from "./PostThread";
import { PromptList } from "./PromptList";
import { usePostTransition } from "./usePostTransition";

type SaveState = "saved" | "saving" | "offline" | "conflict" | "error";
type Fields = {
  title: string;
  body: string;
  internalNotes: string;
  channelId: string;
  campaignId: string;
  plannedOn: string;
  time: string;
};

const draftKey = (id: string) => `post-draft:${id}`;

export function PostEditor({
  slug,
  post,
  thread,
  role,
  userId,
  organizationName,
  channels,
  campaigns,
  members,
  siblings,
  media,
  library,
  aiStatus,
}: {
  slug: string;
  post: PostDetail;
  thread: Thread;
  role: MemberRole;
  userId: string;
  organizationName: string;
  channels: (ChannelOption & { connected?: boolean })[];
  campaigns: CampaignOption[];
  members: MemberInfo[];
  siblings: { id: string; status: PostStatus; hasText: boolean; channels: { type: ChannelOption["type"]; name: string } | null }[];
  media: AssetItem[];
  library: AssetItem[];
  aiStatus: AiStatus;
}) {
  const t = useTranslations("posts.editor");
  const tc = useTranslations("channels.types");
  const tr = useTranslations("nav.roles");
  const te = useTranslations("errors");
  const tv = useTranslations("validation");
  const ta = useTranslations("ai");
  const toast = useToast();
  const router = useRouter();
  const memberMap = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);

  const local = post.scheduled_at ? isoToBerlinLocal(post.scheduled_at) : null;
  const initial: Fields = {
    title: post.title,
    body: post.body,
    internalNotes: post.internal_notes ?? "",
    channelId: post.channel_id,
    campaignId: post.campaign_id ?? "",
    plannedOn: local?.date ?? post.planned_on ?? "",
    time: local?.time ?? "",
  };
  const [fields, setFields] = useState<Fields>(initial);
  const [status, setStatus] = useState<PostStatus>(post.status);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const version = useRef(post.version);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panel, setPanel] = useState<"assistant" | "preview" | "activity">(
    aiStatus.allowed && role !== "viewer" && post.status !== "published" && post.status !== "evaluated" ? "assistant" : "preview",
  );
  const [mobileTab, setMobileTab] = useState<"text" | "side">("text");
  const [highlight, setHighlight] = useState(false);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adaptOnTransfer, setAdaptOnTransfer] = useState(true);
  const [busy, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferIds, setTransferIds] = useState<string[]>([]);

  const locked = status === "published" || status === "evaluated";
  const canEditText = !locked && role !== "viewer";
  const canEditMeta = canEditText && (role === "owner" || role === "editor");
  const channel = channels.find((c) => c.id === fields.channelId);
  const limit = channel ? CHANNEL_TEXT_LIMITS[channel.type] : undefined;

  const save = useCallback(
    async (f: Fields) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        localStorage.setItem(draftKey(post.id), JSON.stringify(f));
        setSaveState("offline");
        return;
      }
      setSaveState("saving");
      const scheduledAt = f.plannedOn && f.time ? berlinLocalToIso(f.plannedOn, f.time) : null;
      try {
        const res = await savePostContent(slug, post.id, version.current, {
          title: f.title,
          body: f.body,
          internalNotes: f.internalNotes,
          channelId: f.channelId,
          campaignId: f.campaignId || null,
          plannedOn: f.plannedOn || null,
          scheduledAt,
        });
        if (res.error === "conflict") return setSaveState("conflict");
        if (res.error || !res.data) {
          setSaveState("error");
          return toast({ kind: "error", title: te(res.error ?? "generic") });
        }
        version.current = res.data.version;
        if (res.data.status !== status) {
          setStatus(res.data.status as PostStatus);
          if (res.data.status === "draft") toast({ kind: "info", title: t("backToDraft") });
        }
        localStorage.removeItem(draftKey(post.id));
        dirty.current = false;
        setSaveState("saved");
      } catch {
        // Netzwerkfehler: lokal sichern und später nachsenden
        localStorage.setItem(draftKey(post.id), JSON.stringify(f));
        setSaveState("offline");
      }
    },
    [post.id, slug, status, t, te, toast],
  );

  function update(patch: Partial<Fields>) {
    const next = { ...fields, ...patch };
    setFields(next);
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 1000); // Autospeichern 1 s nach der letzten Eingabe
  }

  // Nach Statuswechseln (neu geladen vom Server) Version und Status übernehmen
  useEffect(() => {
    if (!dirty.current) {
      version.current = post.version;
      setStatus(post.status);
    }
  }, [post.version, post.status]);

  // Offline-Entwurf nach Wiederverbindung nachsenden
  useEffect(() => {
    const flush = () => {
      const raw = localStorage.getItem(draftKey(post.id));
      if (raw) void save(JSON.parse(raw) as Fields);
    };
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [post.id, save]);

  // Nicht gespeicherte Änderungen beim Verlassen
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const getTarget = () => ({
    id: post.id,
    status,
    version: version.current,
    scheduled_at: fields.plannedOn && fields.time ? berlinLocalToIso(fields.plannedOn, fields.time) : null,
    planned_on: fields.plannedOn || null,
  });
  const transition = usePostTransition({
    slug,
    role,
    onOptimistic: (_id, to) => {
      const prev = status;
      setStatus(to);
      return () => setStatus(prev);
    },
    onDone: () => router.refresh(),
  });

  async function flushThen(fn: () => void) {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      await save(fields);
    }
    fn();
  }

  function approve(note?: string, thenSchedule = false) {
    void flushThen(() =>
      startTransition(async () => {
        const res = await transitionPost(slug, post.id, "approved", note);
        if (res.error) return toast({ kind: "error", title: te(res.error) });
        setStatus("approved");
        version.current = res.data!.version;
        if (thenSchedule) transition.openSchedule({ ...getTarget(), status: "approved", version: res.data!.version });
        toast({
          kind: "success",
          title: t("approved"),
          duration: 8000,
          action: {
            label: t("undo"),
            onClick: () =>
              startTransition(async () => {
                const r = await transitionPost(slug, post.id, "in_review");
                if (r.error) toast({ kind: "error", title: te(r.error) });
                else setStatus("in_review");
                router.refresh();
              }),
          },
        });
        router.refresh();
      }),
    );
  }

  // Hauptaktion nach Status und Rolle (ScreenPostEditor)
  type ActionKind = "approveAndSchedule" | "submit" | "approve" | "withdraw" | "schedule" | "reschedule" | "unschedule";
  function runAction(kind: ActionKind) {
    switch (kind) {
      case "approveAndSchedule":
        return approve(undefined, true);
      case "approve":
        return approve();
      case "submit":
        return void flushThen(() => transition.run(getTarget(), "in_review"));
      case "withdraw":
        return transition.run(getTarget(), "draft");
      case "schedule":
        return void flushThen(() => transition.openSchedule(getTarget()));
      case "reschedule":
        return transition.openSchedule(getTarget());
      case "unschedule":
        return transition.run(getTarget(), "approved");
    }
  }
  const ACTION_ICON: Record<ActionKind, React.ReactNode> = {
    approveAndSchedule: <Check aria-hidden />,
    approve: <Check aria-hidden />,
    submit: <Send aria-hidden />,
    withdraw: <Undo2 aria-hidden />,
    schedule: <CalendarClock aria-hidden />,
    reschedule: <CalendarClock aria-hidden />,
    unschedule: <Undo2 aria-hidden />,
  };
  let primary: ActionKind | null = null;
  let secondary: ActionKind | null = null;
  if (!locked && role !== "viewer") {
    if (["idea", "draft", "changes_requested"].includes(status)) {
      if (role === "owner") {
        primary = "approveAndSchedule";
        secondary = "submit";
      } else {
        primary = "submit";
      }
    } else if (status === "in_review") {
      if (role === "owner") primary = "approve";
      else secondary = "withdraw";
    } else if (status === "approved" && canTransition(role, "approved", "scheduled")) {
      primary = "schedule";
    } else if (status === "scheduled" && canTransition(role, "scheduled", "approved")) {
      primary = "reschedule";
      secondary = "unschedule";
    }
  }

  const publishError = parsePublishError(post.publish_error);
  // Sofort veröffentlichen: nur freigegeben/geplant, verbundener Kanal, Rolle mit Planungsrecht
  const canPublishNow =
    (status === "approved" || status === "scheduled") && Boolean(channel?.connected) && (role === "owner" || role === "editor") && saveState === "saved";

  function doPublish() {
    void flushThen(() =>
      startTransition(async () => {
        const res = await publishNow(slug, post.id);
        setConfirmPublish(false);
        if (res.error) {
          const code = (res as { publishError?: string }).publishError;
          return toast({ kind: "error", title: code ? t(`publishErrors.${code}` as never) : te(res.error) });
        }
        setStatus("published");
        toast({ kind: "success", title: t("publishedNow", { channel: channel ? tc(channel.type) : "" }) });
        router.refresh();
      }),
    );
  }

  const canAdapt = aiStatus.configured && aiStatus.allowed && fields.body.trim().length > 0;

  /** KI-Text übernehmen: 2 s hinterlegen, alten Text für „Rückgängig“ zurückgeben */
  function applyAiText(text: string) {
    const previous = fields.body;
    update({ body: text });
    setHighlight(true);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlight(false), 2000);
    return previous;
  }

  const step = statusStep(status);
  const siblingTypes = new Set(siblings.flatMap((s) => (s.channels ? [s.channels.type] : [])));
  const transferOptions = channels.filter((c) => c.id !== fields.channelId && !siblingTypes.has(c.type));
  const assignees = post.post_assignees.map((a) => a.user_id);

  const saveLabel = {
    saved: t("save.saved"),
    saving: t("save.saving"),
    offline: t("save.offline"),
    conflict: t("save.conflict"),
    error: t("save.error"),
  }[saveState];

  const content = (
    <div className="flex flex-col gap-6">
      {saveState === "conflict" && (
        <Banner
          kind="warning"
          action={
            <Button size="sm" onClick={() => window.location.reload()}>
              {t("reload")}
            </Button>
          }
        >
          {t("conflict")}
        </Banner>
      )}
      {publishError && status === "scheduled" && (
        <Banner kind="error">
          {t(`publishErrors.${publishError.code}`)}
          {publishError.detail && <span className="block text-small text-text-muted">{publishError.detail}</span>}
        </Banner>
      )}
      {locked && <Banner kind="info">{t("lockedHint")}</Banner>}

      <div className="grid gap-4 tablet:grid-cols-2">
        <Select
          label={t("channel")}
          value={fields.channelId}
          disabled={!canEditMeta}
          onChange={(e) => update({ channelId: e.target.value })}
          options={channels.map((c) => ({ value: c.id, label: tc(c.type) }))}
        />
        <Select
          label={t("campaign")}
          optional
          value={fields.campaignId}
          disabled={!canEditMeta}
          onChange={(e) => update({ campaignId: e.target.value })}
          placeholder={t("noCampaign")}
          options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
        />
        <div className="grid grid-cols-[1fr_auto] gap-2 tablet:col-span-2 desktop:col-span-1">
          <TextField
            label={t("day")}
            optional
            type="date"
            value={fields.plannedOn}
            disabled={!canEditMeta}
            onChange={(e) => update({ plannedOn: e.target.value, time: e.target.value ? fields.time : "" })}
          />
          <TextField
            label={t("time")}
            optional
            type="time"
            step={900}
            value={fields.time}
            disabled={!canEditMeta || !fields.plannedOn}
            onChange={(e) => update({ time: e.target.value })}
          />
        </div>
      </div>

      <TextField
        label={t("title")}
        hint={t("titleHint")}
        value={fields.title}
        maxLength={200}
        readOnly={!canEditText}
        onChange={(e) => update({ title: e.target.value })}
      />

      <div className="flex flex-col gap-2">
        {(siblings.length > 0 || transferOptions.length > 0) && (
          <div className="flex flex-wrap items-center gap-2" aria-label={t("otherChannels")}>
            {channel && <ChannelChip type={channel.type} label={tc(channel.type)} state="selected" />}
            {siblings.map((s) =>
              s.channels ? (
                <Link key={s.id} href={`/o/${slug}/posts/${s.id}`} className="rounded-full hover:opacity-80">
                  <ChannelChip type={s.channels.type} label={tc(s.channels.type)} />
                </Link>
              ) : null,
            )}
            {canEditMeta && transferOptions.length > 0 && (
              <Button size="sm" variant="ghost" icon={<Copy className="icon-sm" />} onClick={() => setTransferOpen(true)}>
                {t("transfer")}
              </Button>
            )}
          </div>
        )}
        <TextArea
          label={t("text")}
          value={fields.body}
          readOnly={!canEditText}
          maxLength={limit}
          showCount={!!limit}
          onChange={(e) => update({ body: e.target.value })}
          error={limit && fields.body.length > limit ? tv("tooLong") : undefined}
          className={cx(
            "[&_textarea]:min-h-48 [&_textarea]:transition-colors [&_textarea]:duration-(--duration-base)",
            highlight && "[&_textarea]:bg-ai-soft",
          )}
        />
      </div>

      <TextArea
        label={t("notes")}
        optional
        hint={t("notesHint")}
        value={fields.internalNotes}
        readOnly={!canEditText}
        onChange={(e) => update({ internalNotes: e.target.value })}
      />

      <PostMedia
        slug={slug}
        organizationId={post.organization_id}
        postId={post.id}
        linked={media}
        library={library}
        readOnly={!canEditText}
      />

      {canEditMeta && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-label">{t("assignees")}</legend>
          <div className="flex flex-wrap gap-2">
            {members
              .filter((m) => m.role !== "viewer")
              .map((m) => {
                const on = assignees.includes(m.userId);
                return (
                  <label
                    key={m.userId}
                    className={cx(
                      "inline-flex h-(--size-control-sm) cursor-pointer items-center gap-1.5 rounded-full px-3 text-small font-semibold",
                      "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                      on ? "border-2 border-primary bg-primary-soft text-primary" : "border border-border-strong hover:bg-surface-hover",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() =>
                        startTransition(async () => {
                          const next = on ? assignees.filter((a) => a !== m.userId) : [...assignees, m.userId];
                          const res = await setAssignees(slug, post.id, next);
                          if (res.error) toast({ kind: "error", title: te(res.error) });
                          router.refresh();
                        })
                      }
                    />
                    {m.fullName || t("unnamed")} · {tr(m.role)}
                    {on && <Check aria-hidden className="icon-sm" />}
                  </label>
                );
              })}
          </div>
          <p className="text-small text-text-muted">{t("assigneesHint")}</p>
        </fieldset>
      )}

      <PromptList
        slug={slug}
        postId={post.id}
        initial={thread.prompts}
        readOnly={!canEditText}
        canRun={aiStatus.configured && aiStatus.allowed && canEditText}
        onUseResult={(text) => void applyAiText(text)}
      />

      <PostThread
        slug={slug}
        postId={post.id}
        status={status}
        thread={thread}
        members={memberMap}
        userId={userId}
        role={role}
        busy={busy || transition.busy}
        onApprove={approve}
        onRequestChanges={() => transition.run(getTarget(), "changes_requested")}
      />

      {role !== "viewer" && role !== "external" && !locked && (
        <div className="border-t border-border pt-4">
          <Button variant="ghost" icon={<Trash2 aria-hidden />} onClick={() => setConfirmDelete(true)} className="text-text-muted">
            {t("delete")}
          </Button>
        </div>
      )}
    </div>
  );

  const side = (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="hidden gap-0.5 self-start rounded-md bg-surface-sunken p-[3px] tablet:inline-flex">
        {(["assistant", "preview", "activity"] as const).map((p) => (
          <button
            key={p}
            role="tab"
            type="button"
            aria-selected={panel === p}
            onClick={() => setPanel(p)}
            className={cx("h-[34px] rounded-[8px] px-4 text-label", panel === p ? "bg-surface shadow-sm" : "text-text-muted hover:text-text")}
          >
            {p === "assistant" && <Sparkles aria-hidden className="mr-1 inline icon-sm text-ai" />}
            {t(`panel.${p}`)}
          </button>
        ))}
      </div>
      {panel === "assistant" ? (
        channel && (
          <AssistantPanel
            slug={slug}
            postId={post.id}
            channel={channel.type}
            body={fields.body}
            readOnly={!canEditText}
            status={aiStatus}
            sources={siblings.flatMap((s) => (s.hasText && s.channels ? [{ id: s.id, type: s.channels.type }] : []))}
            onApply={applyAiText}
            onUndo={(previous) => update({ body: previous })}
          />
        )
      ) : panel === "preview" ? (
        channel && (
          <PostPreview
            channel={channel.type}
            text={fields.body}
            organizationName={organizationName}
            image={media.find((m) => (m.kind === "image" || m.kind === "logo") && m.url)}
          />
        )
      ) : (
        <ActivityList entries={thread.activity} members={memberMap} />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <nav aria-label={t("breadcrumb")} className="flex flex-wrap items-center gap-1 text-label">
          <Link href={`/o/${slug}/posts`} className="inline-flex items-center gap-1 text-primary hover:underline">
            <ChevronLeft aria-hidden className="icon-sm" />
            {t("back")}
          </Link>
          {post.campaigns && (
            <>
              <span className="text-text-muted">/</span>
              <Link href={`/o/${slug}/campaigns/${post.campaigns.id}`} className="text-primary hover:underline">
                {post.campaigns.name}
              </Link>
            </>
          )}
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          {channel && <ChannelMono type={channel.type} size="lg" />}
          <h1 className="min-w-0 flex-1 truncate text-h1">{fields.title || t("untitled")}</h1>
          <div className="flex flex-wrap gap-2">
            {secondary && (
              <Button icon={ACTION_ICON[secondary]} onClick={() => runAction(secondary!)} disabled={busy || transition.busy}>
                {t(secondary)}
              </Button>
            )}
            {canPublishNow && (
              <Button icon={<Rocket aria-hidden />} onClick={() => setConfirmPublish(true)} disabled={busy || transition.busy}>
                {t("publishNow")}
              </Button>
            )}
            {primary && (
              <Button variant="primary" icon={ACTION_ICON[primary]} onClick={() => runAction(primary!)} loading={busy || transition.busy}>
                {t(primary)}
              </Button>
            )}
            {(status === "published" || status === "evaluated") && post.external_url && (
              <a href={post.external_url} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary" })}>
                <ExternalLink aria-hidden className="icon-sm" />
                {t("viewPublished", { channel: channel ? tc(channel.type) : "" })}
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          <span role="status" className={cx("inline-flex items-center gap-1 text-small", saveState === "saved" ? "text-text-muted" : "text-text")}>
            {saveState === "offline" && <CloudOff aria-hidden className="icon-sm" />}
            {saveLabel}
          </span>
          {post.scheduled_at && status === "scheduled" && (
            <span className="text-small text-text-muted">{t("scheduledFor", { when: formatDateTime(post.scheduled_at) })}</span>
          )}
          <div className="ml-auto flex w-40 gap-0.5" role="img" aria-label={t("progress", { step, total: 7 })}>
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} className={cx("block h-1 flex-1 rounded-[2px]", i < step ? "bg-primary" : "bg-border")} />
            ))}
          </div>
        </div>
      </header>

      {/* Mobil: eine Tab-Leiste Text · Assistent · Vorschau · Verlauf */}
      <div role="tablist" className="inline-flex gap-0.5 self-start rounded-md bg-surface-sunken p-[3px] tablet:hidden">
        {(["text", "assistant", "preview", "activity"] as const).map((p) => {
          const active = p === "text" ? mobileTab === "text" : mobileTab === "side" && panel === p;
          return (
            <button
              key={p}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => {
                setMobileTab(p === "text" ? "text" : "side");
                if (p !== "text") setPanel(p);
              }}
              className={cx("h-[34px] rounded-[8px] px-3 text-label", active ? "bg-surface shadow-sm" : "text-text-muted")}
            >
              {t(`mobileTabs.${p}`)}
            </button>
          );
        })}
      </div>

      <div className="grid gap-8 tablet:grid-cols-[1fr_minmax(0,400px)]">
        <div className={cx("min-w-0", mobileTab !== "text" && "hidden tablet:block")}>{content}</div>
        <aside className={cx("tablet:sticky tablet:top-8 tablet:self-start", mobileTab !== "side" && "hidden tablet:block")}>{side}</aside>
      </div>

      {transition.dialogs}

      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        busy={busy}
        icon={<Copy />}
        title={t("transferTitle")}
        subtitle={t("transferSubtitle")}
        footer={
          <>
            <Button onClick={() => setTransferOpen(false)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={transferIds.length === 0}
              onClick={() =>
                void flushThen(() =>
                  startTransition(async () => {
                    const res = await transferPost(slug, post.id, transferIds);
                    if (res.error || !res.data) return toast({ kind: "error", title: te(res.error ?? "generic") });
                    const count = res.data.ids.length;
                    if (canAdapt && adaptOnTransfer) {
                      // Kopien sind angelegt; die KI passt sie danach je Kanal an
                      const adapted = await adaptTransferred(slug, post.id, res.data.ids);
                      if (adapted.error) toast({ kind: "warning", title: t("transferredNoAi", { count }), text: ta(`errors.${adapted.error}` as never) });
                      else toast({ kind: "ai", title: t("transferredAi", { count: adapted.data!.adapted }) });
                    } else {
                      toast({ kind: "success", title: t("transferred", { count }) });
                    }
                    setTransferOpen(false);
                    setTransferIds([]);
                    router.refresh();
                  }),
                )
              }
            >
              {t("transferSubmit")}
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {transferOptions.map((c) => {
            const on = transferIds.includes(c.id);
            return (
              <label key={c.id} className="cursor-pointer rounded-full has-focus-visible:outline-2 has-focus-visible:outline-focus">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  onChange={() => setTransferIds((ids) => (on ? ids.filter((i) => i !== c.id) : [...ids, c.id]))}
                />
                <ChannelChip type={c.type} label={tc(c.type)} state={on ? "selected" : "default"} />
              </label>
            );
          })}
        </div>
        {canAdapt && (
          <label className="mt-4 flex items-start gap-2 text-body">
            <input
              type="checkbox"
              checked={adaptOnTransfer}
              onChange={(e) => setAdaptOnTransfer(e.target.checked)}
              className="mt-0.5 size-5 accent-[var(--color-ai)]"
            />
            <span className="flex flex-col">
              <span>{t("transferAdapt")}</span>
              <span className="text-small text-text-muted">{t("transferAdaptHint")}</span>
            </span>
          </label>
        )}
      </Modal>

      <Modal
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        size="sm"
        busy={busy}
        icon={<Rocket />}
        title={t("publishNowTitle", { channel: channel ? tc(channel.type) : "" })}
        footer={
          <>
            <Button onClick={() => setConfirmPublish(false)} disabled={busy} data-autofocus>
              {t("cancel")}
            </Button>
            <Button variant="primary" icon={<Rocket aria-hidden />} loading={busy} onClick={doPublish}>
              {t("publishNowConfirm")}
            </Button>
          </>
        }
      >
        <p className="text-body text-text-muted">{t("publishNowText")}</p>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        variant="danger"
        size="sm"
        busy={busy}
        icon={<Trash2 />}
        title={t("deleteTitle")}
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)} disabled={busy} data-autofocus>
              {t("keep")}
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() =>
                startTransition(async () => {
                  const res = await deletePost(slug, post.id);
                  if (res.error) {
                    setConfirmDelete(false);
                    return toast({ kind: "error", title: te(res.error) });
                  }
                  dirty.current = false;
                  toast({ kind: "success", title: t("deleted") });
                  router.push(`/o/${slug}/posts`);
                })
              }
            >
              {t("delete")}
            </Button>
          </>
        }
      >
        <p className="text-body text-text-muted">{t("deleteText")}</p>
      </Modal>
    </div>
  );
}
