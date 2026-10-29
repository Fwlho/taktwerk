"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelChip } from "@/components/domain/ChannelChip";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { TextArea } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatDayMonth } from "@/lib/format";
import type { PendingApproval } from "@/server/posts/approvals";
import { transitionPost } from "@/server/posts/actions";
import { PostPreview } from "@/components/posts/PostPreview";
import type { MemberInfo } from "@/components/posts/PostCard";

const REASONS = ["text", "image", "date", "tone"] as const;
const QUEUE_KEY = "approval-queue";
type Queued = { slug: string; postId: string; to: "approved" | "changes_requested"; comment?: string };

function readQueue(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as Queued[];
  } catch {
    return [];
  }
}
function writeQueue(q: Queued[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // Speicher gesperrt
  }
}

/** Freigeben mit einem Tipp: Durchlauf durch alle offenen Beiträge (ScreenApprovalMobile, Schritt 2–4). */
export function ApprovalReview({
  slug,
  organizationName,
  items: initialItems,
  startIndex,
  members,
}: {
  slug: string;
  organizationName: string;
  items: PendingApproval[];
  startIndex: number;
  members: MemberInfo[];
}) {
  const t = useTranslations("approvals");
  const tt = useTranslations("posts.transition");
  const tc = useTranslations("channels.types");
  const te = useTranslations("errors");
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(initialItems.length - 1, 0)));
  const [note, setNote] = useState("");
  const [changesOpen, setChangesOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, startTransition] = useTransition();
  const touchX = useRef<number | null>(null);
  const names = new Map(members.map((m) => [m.userId, m]));

  // Offline gepufferte Entscheidungen nachsenden, sobald wieder online
  useEffect(() => {
    async function flush() {
      const queue = readQueue();
      if (!queue.length || !navigator.onLine) return;
      const rest: Queued[] = [];
      for (const q of queue) {
        try {
          await transitionPost(q.slug, q.postId, q.to, q.comment);
        } catch {
          rest.push(q);
        }
      }
      writeQueue(rest);
      if (rest.length < queue.length) {
        toast({ kind: "success", title: t("queueSent") });
        router.refresh();
      }
    }
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [router, t, toast]);

  const post = items[index];
  const total = items.length;

  function vibrate() {
    try {
      navigator.vibrate?.(15);
    } catch {
      // nicht unterstützt
    }
  }

  function decide(to: "approved" | "changes_requested", comment?: string) {
    if (!post) return;
    const current = post;
    const at = index;
    vibrate();
    // Optimistisch: sofort weiter zum nächsten Beitrag
    setItems((list) => list.filter((p) => p.id !== current.id));
    setIndex((i) => Math.min(i, Math.max(total - 2, 0)));
    setNote("");
    startTransition(async () => {
      let res;
      try {
        res = await transitionPost(slug, current.id, to, comment);
      } catch {
        // Keine Verbindung: Entscheidung puffern
        writeQueue([...readQueue(), { slug, postId: current.id, to, comment }]);
        return toast({ kind: "warning", title: t("offlineQueued"), duration: "persistent" });
      }
      if (res.error) {
        setItems((list) => [...list.slice(0, at), current, ...list.slice(at)]);
        setIndex(at);
        return toast({ kind: "error", title: res.error === "generic" ? t("offline") : te(res.error) });
      }
      toast({
        kind: "success",
        title: to === "approved" ? t("approvedToast", { title: current.title || t("untitled") }) : t("sentBackToast"),
        duration: 8000,
        action: {
          label: tt("undo"),
          onClick: () =>
            startTransition(async () => {
              const back = await transitionPost(slug, current.id, "in_review");
              if (back.error) return toast({ kind: "error", title: te(back.error) });
              setItems((list) => [...list.slice(0, at), current, ...list.slice(at)]);
              setIndex(at);
            }),
        },
      });
      router.refresh();
    });
  }

  const requester = post?.requestedBy ? names.get(post.requestedBy) : undefined;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-(--z-nav) flex h-14 items-center gap-2 border-b border-border bg-surface px-4 pt-[env(safe-area-inset-top)]">
        <Link href={`/o/${slug}/approvals`} className={buttonClasses({ variant: "ghost", size: "sm" })} aria-label={t("close")}>
          <X aria-hidden />
        </Link>
        <span className="flex-1 text-center font-display text-[18px] font-bold">
          {total > 0 ? t("progress", { current: index + 1, total }) : t("title")}
        </span>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t("prev")}
          icon={<ChevronLeft />}
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        />
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t("next")}
          icon={<ChevronRight />}
          disabled={index >= total - 1}
          onClick={() => setIndex((i) => i + 1)}
        />
      </header>

      {!post ? (
        <main className="flex flex-1 items-center justify-center px-4">
          <EmptyState
            kind="done"
            title={t("doneTitle")}
            text={t("doneText")}
            actions={
              <Link href={`/o/${slug}`} className={buttonClasses({ variant: "primary" })}>
                {t("toDashboard")}
              </Link>
            }
          />
        </main>
      ) : (
        <>
          <main
            className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-4 px-4 pt-4 pb-[calc(200px+env(safe-area-inset-bottom))]"
            onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              const start = touchX.current;
              const end = e.changedTouches[0]?.clientX;
              touchX.current = null;
              if (start == null || end == null || Math.abs(end - start) < 60) return;
              if (end < start && index < total - 1) setIndex(index + 1);
              if (end > start && index > 0) setIndex(index - 1);
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              {post.channels && <ChannelChip type={post.channels.type} label={tc(post.channels.type)} />}
              <StatusBadge status="in_review" />
            </div>
            <h1 className="text-h1">{post.title || t("untitled")}</h1>
            <p className="inline-flex items-center gap-1 text-body text-text-muted">
              <CalendarClock aria-hidden className="icon-sm" />
              {post.scheduled_at ? formatDateTime(post.scheduled_at) : post.planned_on ? formatDayMonth(post.planned_on) : t("noDate")}
            </p>
            {post.channels && <PostPreview channel={post.channels.type} text={post.body} organizationName={organizationName} />}
            {post.lastComment && (
              <div className="flex gap-3 rounded-lg border border-border bg-surface p-3">
                <Avatar
                  name={names.get(post.lastComment.author_id ?? "")?.fullName ?? "?"}
                  size="lg"
                  external={names.get(post.lastComment.author_id ?? "")?.role === "external"}
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-label font-bold">{names.get(post.lastComment.author_id ?? "")?.fullName}</span>
                  <p className="text-body">{post.lastComment.body}</p>
                </div>
              </div>
            )}
            <Link href={`/o/${slug}/posts/${post.id}`} className="self-start text-label text-primary hover:underline">
              {t("openEditor")}
            </Link>
          </main>

          {/* Fixierte Aktionsleiste im Daumenbereich */}
          <div className="fixed inset-x-0 bottom-0 z-(--z-nav) border-t border-border bg-surface px-4 pt-3 pb-[calc(var(--space-4)+env(safe-area-inset-bottom))]">
            <div className="mx-auto flex max-w-[640px] flex-col gap-3">
              <label>
                <span className="sr-only">{t("note")}</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("notePlaceholder")}
                  className="h-(--size-control) w-full rounded-md border border-border-strong bg-surface px-3 text-body hover:border-text focus-visible:border-focus"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  icon={<RotateCcw aria-hidden />}
                  disabled={busy}
                  onClick={() => {
                    setReason(note);
                    setChangesOpen(true);
                  }}
                >
                  {t("changes")}
                </Button>
                <Button size="lg" variant="primary" icon={<Check aria-hidden />} disabled={busy} onClick={() => decide("approved", note)}>
                  {t("approve")}
                </Button>
              </div>
            </div>
          </div>

          <Modal
            open={changesOpen}
            onClose={() => setChangesOpen(false)}
            icon={<RotateCcw />}
            title={t("changesTitle")}
            footer={
              <>
                <Button onClick={() => setChangesOpen(false)}>{tt("cancel")}</Button>
                <Button
                  variant="primary"
                  disabled={!reason.trim()}
                  onClick={() => {
                    setChangesOpen(false);
                    decide("changes_requested", reason);
                  }}
                >
                  {requester ? t("sendBackTo", { name: requester.fullName.split(" ")[0] ?? "" }) : tt("sendBack")}
                </Button>
              </>
            }
          >
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason((c) => (c ? `${c} ${tt(`reasons.${r}`)}` : tt(`reasons.${r}`)))}
                  className="inline-flex h-(--size-control) items-center rounded-full border border-border-strong px-4 text-small font-semibold hover:bg-surface-hover"
                >
                  {tt(`reasons.${r}`)}
                </button>
              ))}
            </div>
            <TextArea label={tt("comment")} value={reason} onChange={(e) => setReason(e.target.value)} data-autofocus />
          </Modal>
        </>
      )}
    </div>
  );
}
