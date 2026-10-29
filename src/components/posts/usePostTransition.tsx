"use client";

import { useState, useTransition, type ReactNode } from "react";
import { CalendarClock, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextArea, TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { PostStatus } from "@/lib/domain";
import { berlinLocalToIso, isoToBerlinLocal, todayBerlin } from "@/lib/format";
import { canTransition } from "@/lib/post-transitions";
import type { MemberRole } from "@/server/db/database.types";
import { schedulePost, transitionPost } from "@/server/posts/actions";

export type TransitionTarget = { id: string; status: PostStatus; version?: number; scheduled_at?: string | null; planned_on?: string | null };

type Pending =
  | { kind: "comment"; post: TransitionTarget }
  | { kind: "schedule"; post: TransitionTarget }
  | null;

const QUICK_REASONS = ["text", "image", "date", "tone"] as const;

/**
 * Statuswechsel mit allen Regeln der Oberfläche:
 * „Änderung gewünscht“ fragt nach Kommentar, „Geplant“ nach Termin,
 * danach Toast mit „Rückgängig“ (8 s), wenn der Rückweg erlaubt ist.
 */
export function usePostTransition({
  slug,
  role,
  onOptimistic,
  onDone,
}: {
  slug: string;
  role: MemberRole;
  /** sofort anzeigen; Rückgabe = Funktion zum Zurücknehmen bei Fehler */
  onOptimistic?: (id: string, to: PostStatus) => () => void;
  onDone?: () => void;
}) {
  const t = useTranslations("posts.transition");
  const ts = useTranslations("posts.status");
  const te = useTranslations("errors");
  const toast = useToast();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [error, setError] = useState<string | null>(null);

  async function execute(post: TransitionTarget, to: PostStatus, note?: string) {
    const from = post.status;
    const revert = onOptimistic?.(post.id, to);
    const res = await transitionPost(slug, post.id, to, note);
    if (res.error) {
      revert?.();
      toast({ kind: "error", title: te(res.error) });
      return false;
    }
    const undo = canTransition(role, to, from)
      ? {
          label: t("undo"),
          onClick: () =>
            startTransition(async () => {
              const back = onOptimistic?.(post.id, from);
              const r = await transitionPost(slug, post.id, from);
              if (r.error) {
                back?.();
                toast({ kind: "error", title: te(r.error) });
              }
              onDone?.();
            }),
        }
      : undefined;
    toast({ kind: "success", title: t("moved", { status: ts(to) }), action: undo, duration: 8000 });
    onDone?.();
    return true;
  }

  function run(post: TransitionTarget, to: PostStatus) {
    if (!canTransition(role, post.status, to)) {
      toast({
        kind: "info",
        title: to === "approved" || to === "changes_requested" ? t("onlyOwner") : t("notAllowed", { status: ts(to) }),
      });
      return;
    }
    setError(null);
    if (to === "changes_requested") {
      setComment("");
      setPending({ kind: "comment", post });
      return;
    }
    if (to === "scheduled" && (!post.scheduled_at || new Date(post.scheduled_at) <= new Date())) {
      const local = post.scheduled_at ? isoToBerlinLocal(post.scheduled_at) : null;
      setDate(local?.date ?? post.planned_on ?? todayBerlin());
      setTime(local?.time ?? "09:00");
      setPending({ kind: "schedule", post });
      return;
    }
    startTransition(async () => {
      await execute(post, to);
    });
  }

  function openSchedule(post: TransitionTarget) {
    const local = post.scheduled_at ? isoToBerlinLocal(post.scheduled_at) : null;
    setDate(local?.date ?? post.planned_on ?? todayBerlin());
    setTime(local?.time ?? "09:00");
    setError(null);
    setPending({ kind: "schedule", post });
  }

  function close() {
    if (!busy) setPending(null);
  }

  const dialogs: ReactNode = (
    <>
      <Modal
        open={pending?.kind === "comment"}
        onClose={close}
        busy={busy}
        icon={<RotateCcw />}
        title={t("changesTitle")}
        subtitle={t("changesSubtitle")}
        footer={
          <>
            <Button onClick={close} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={!comment.trim()}
              onClick={() =>
                startTransition(async () => {
                  if (pending?.kind !== "comment") return;
                  const ok = await execute(pending.post, "changes_requested", comment);
                  if (ok) setPending(null);
                })
              }
            >
              {t("sendBack")}
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setComment((c) => (c ? `${c} ${t(`reasons.${r}`)}` : t(`reasons.${r}`)))}
              className="inline-flex h-(--size-control-sm) items-center rounded-full border border-border-strong px-3 text-small font-semibold hover:bg-surface-hover"
            >
              {t(`reasons.${r}`)}
            </button>
          ))}
        </div>
        <TextArea label={t("comment")} value={comment} onChange={(e) => setComment(e.target.value)} data-autofocus />
      </Modal>

      <Modal
        open={pending?.kind === "schedule"}
        onClose={close}
        busy={busy}
        icon={<CalendarClock />}
        title={t("scheduleTitle")}
        footer={
          <>
            <Button onClick={close} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={!date || !time}
              onClick={() =>
                startTransition(async () => {
                  if (pending?.kind !== "schedule") return;
                  const iso = berlinLocalToIso(date, time);
                  if (new Date(iso) <= new Date()) return setError("scheduleRequired");
                  const res = await schedulePost(slug, pending.post.id, iso, pending.post.version);
                  if (res.error) return setError(res.error);
                  toast({ kind: "success", title: t("scheduled") });
                  setPending(null);
                  onDone?.();
                })
              }
            >
              {t("schedule")}
            </Button>
          </>
        }
      >
        {error && <Banner kind="error">{te(error)}</Banner>}
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <TextField label={t("date")} type="date" value={date} min={todayBerlin()} onChange={(e) => setDate(e.target.value)} data-autofocus />
          <TextField label={t("time")} type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <p className="text-small text-text-muted">{t("scheduleHint")}</p>
      </Modal>
    </>
  );

  return { run, openSchedule, dialogs, busy };
}
