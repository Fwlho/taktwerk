"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, CircleCheck, RotateCcw, Send, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import type { PostStatus } from "@/lib/domain";
import type { MemberRole } from "@/server/db/database.types";
import { addComment, deleteComment } from "@/server/posts/actions";
import type { PostThread as Thread } from "@/server/posts/queries";
import type { MemberInfo } from "./PostCard";

type Item =
  | { kind: "comment"; at: string; c: Thread["comments"][number] }
  | { kind: "decision"; at: string; d: Thread["approvals"][number] };

/** Verlauf aus Kommentaren und Entscheidungen + Freigabe-Block + Eingabe (ApprovalItem). */
export function PostThread({
  slug,
  postId,
  status,
  thread,
  members,
  userId,
  role,
  onApprove,
  onRequestChanges,
  busy,
}: {
  slug: string;
  postId: string;
  status: PostStatus;
  thread: Thread;
  members: Map<string, MemberInfo>;
  userId: string;
  role: MemberRole;
  onApprove: (comment?: string) => void;
  onRequestChanges: () => void;
  busy: boolean;
}) {
  const t = useTranslations("posts.thread");
  const tr = useTranslations("nav.roles");
  const te = useTranslations("errors");
  const format = useFormatter();
  const toast = useToast();
  const [text, setText] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [sending, startTransition] = useTransition();

  // Kommentare, die zu einer Entscheidung gehören, erscheinen in der Entscheidung
  const decisionComments = new Set(thread.approvals.map((a) => a.comment_id).filter(Boolean));
  const items = useMemo<Item[]>(
    () =>
      [
        ...thread.comments.filter((c) => !decisionComments.has(c.id)).map((c) => ({ kind: "comment" as const, at: c.created_at, c })),
        ...thread.approvals.map((d) => ({ kind: "decision" as const, at: d.decided_at, d })),
      ].sort((a, b) => a.at.localeCompare(b.at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [thread],
  );

  const canComment = role !== "viewer";
  const canApprove = role === "owner" && status === "in_review";
  const name = (id: string | null) => (id ? members.get(id)?.fullName || t("unknown") : t("unknown"));
  const when = (iso: string) => format.relativeTime(new Date(iso), new Date());

  function send() {
    const body = text.trim();
    if (!body) return;
    startTransition(async () => {
      const res = await addComment(slug, postId, { body });
      if (res.error) toast({ kind: "error", title: te(res.error) });
      else setText("");
    });
  }

  return (
    <section aria-labelledby="thread-h" className="flex flex-col gap-4">
      <h2 id="thread-h" className="text-h3">
        {t("title")}
      </h2>

      {canApprove && (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-status-review bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="in_review" />
            <span className="ml-auto text-small text-text-muted">{t("waiting")}</span>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-label">
              {t("note")} <span className="font-normal text-text-muted">({t("optional")})</span>
            </span>
            <input
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder={t("notePlaceholder")}
              className="h-(--size-control) rounded-md border border-border-strong bg-surface px-3 text-body hover:border-text focus-visible:border-focus"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button size="lg" icon={<RotateCcw aria-hidden />} onClick={onRequestChanges} disabled={busy}>
              {t("requestChanges")}
            </Button>
            <Button size="lg" variant="primary" icon={<Check aria-hidden />} onClick={() => onApprove(approvalNote)} loading={busy}>
              {t("approve")}
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-small text-text-muted">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {items.map((item) =>
            item.kind === "decision" ? (
              <li
                key={`d-${item.d.id}`}
                className={cx(
                  "flex flex-col gap-1 rounded-md px-4 py-3 text-label",
                  item.d.decision === "approved" ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
                )}
              >
                <span className="flex items-center gap-2">
                  {item.d.decision === "approved" ? <CircleCheck aria-hidden /> : <RotateCcw aria-hidden />}
                  {t(item.d.decision === "approved" ? "approvedBy" : "changesBy", { name: name(item.d.decided_by) })} ·{" "}
                  {when(item.d.decided_at)}
                </span>
                {item.d.comment_id && (
                  <span className="pl-7 font-normal text-text">{thread.comments.find((c) => c.id === item.d.comment_id)?.body}</span>
                )}
              </li>
            ) : (
              <li key={`c-${item.c.id}`} className="group flex gap-3">
                <Avatar
                  name={name(item.c.author_id)}
                  size="lg"
                  external={item.c.author_id ? members.get(item.c.author_id)?.role === "external" : false}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-label font-bold">{name(item.c.author_id)}</span>
                    {item.c.author_id && members.get(item.c.author_id) && (
                      <span className="text-caption font-normal text-text-muted">{tr(members.get(item.c.author_id)!.role)}</span>
                    )}
                    <span className="ml-auto text-caption font-normal text-text-muted">{when(item.c.created_at)}</span>
                  </div>
                  {item.c.quoted_text && (
                    <span className="self-start rounded-sm bg-warning-soft px-1.5 py-0.5 text-small">„{item.c.quoted_text}“</span>
                  )}
                  <p className="text-body whitespace-pre-wrap">{item.c.body}</p>
                </div>
                {(item.c.author_id === userId || role === "owner") && (
                  <button
                    type="button"
                    aria-label={t("deleteComment")}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await deleteComment(slug, item.c.id, postId);
                        if (res.error) toast({ kind: "error", title: te(res.error) });
                      })
                    }
                    className="self-start rounded-md p-1 text-text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-surface-hover"
                  >
                    <Trash2 className="icon-sm" />
                  </button>
                )}
              </li>
            ),
          )}
        </ol>
      )}

      {canComment && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2"
        >
          <label className="flex-1">
            <span className="sr-only">{t("write")}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
              rows={1}
              placeholder={t("write")}
              className="field-sizing-content max-h-40 min-h-(--size-control) w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-body hover:border-text focus-visible:border-focus"
            />
          </label>
          <Button type="submit" variant="primary" iconOnly aria-label={t("send")} icon={<Send />} loading={sending} disabled={!text.trim()} />
        </form>
      )}
    </section>
  );
}
