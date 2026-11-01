"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, CircleCheck, Hourglass, MessageSquare, RotateCcw, UserPlus, type LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cx } from "@/lib/cx";
import { notificationLink } from "@/lib/notifications";
import { fetchNotifications, markNotificationsRead, type NotificationItem } from "@/server/notifications/actions";

const ICONS: Record<string, { icon: LucideIcon; cls: string }> = {
  approval_requested: { icon: Hourglass, cls: "bg-status-review-soft text-status-review" },
  post_approved: { icon: CircleCheck, cls: "bg-success-soft text-success" },
  changes_requested: { icon: RotateCcw, cls: "bg-warning-soft text-warning" },
  comment_added: { icon: MessageSquare, cls: "bg-info-soft text-info" },
  post_assigned: { icon: UserPlus, cls: "bg-primary-soft text-primary" },
};

const POLL_MS = 60_000;

/** Glocke mit ungelesenen Benachrichtigungen; Liste als Popover. */
export function NotificationBell({ slug, initialUnread, id, panelClassName, buttonClassName, showLabel }: {
  slug: string;
  initialUnread: number;
  id: string;
  panelClassName: string;
  buttonClassName?: string;
  showLabel?: boolean;
}) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchNotifications(slug);
      setItems(res.items);
      setUnread(res.unread);
      setError(false);
    } catch {
      setError(true);
    }
  }, [slug]);

  // Zähler regelmäßig aktualisieren, solange das Fenster sichtbar ist
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  async function open(item: NotificationItem) {
    panel.current?.hidePopover();
    if (!item.read_at) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((list) => list?.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)) ?? null);
      void markNotificationsRead(slug, [item.id]);
    }
    router.push(notificationLink(slug, item.type, item.payload.post_id));
  }

  async function markAll() {
    setUnread(0);
    setItems((list) => list?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? null);
    await markNotificationsRead(slug, "all");
  }

  const label = unread > 0 ? t("bellUnread", { count: unread }) : t("bell");

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={label}
        title={label}
        onClick={() => void load()}
        className={cx("relative inline-flex items-center gap-3 rounded-md text-text-muted hover:bg-surface-hover hover:text-text", buttonClassName)}
      >
        <Bell aria-hidden />
        {showLabel && <span className="hidden text-label desktop:inline">{t("title")}</span>}
        {unread > 0 && (
          <span className="absolute top-1 left-[22px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-status-review px-1 text-caption text-surface shadow-[0_0_0_2px_var(--color-surface)]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        aria-label={t("title")}
        className={cx(
          "fixed inset-auto m-0 hidden open:flex max-h-[min(560px,80dvh)] w-[min(380px,calc(100vw-2*var(--space-4)))] flex-col overflow-hidden rounded-lg border border-border bg-surface p-0 text-text shadow-lg",
          panelClassName,
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-h3">{t("title")}</h2>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-small font-semibold text-primary hover:bg-primary-soft">
              <CheckCheck aria-hidden className="icon-sm" />
              {t("markAll")}
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <p className="p-4 text-small text-danger">{t("loadError")}</p>
          ) : items === null ? (
            <div className="flex flex-col gap-2 p-4" aria-busy>
              {[0, 1, 2].map((i) => (
                <span key={i} className="skeleton block h-12" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckCheck aria-hidden />
              </span>
              <p className="text-label">{t("emptyTitle")}</p>
              <p className="text-small text-text-muted">{t("emptyText")}</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {items.map((n) => {
                const meta = ICONS[n.type] ?? ICONS.comment_added!;
                const Icon = meta.icon;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void open(n)}
                      className={cx("flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-hover", !n.read_at && "bg-primary-soft/40")}
                    >
                      <span className={cx("mt-0.5 inline-flex size-8 flex-none items-center justify-center rounded-full", meta.cls)}>
                        <Icon aria-hidden className="icon-sm" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cx("text-small", !n.read_at && "font-semibold")}>{t(`types.${n.type}` as never)}</span>
                        <span className="truncate text-small text-text-muted">{n.payload.title || t("untitled")}</span>
                        <span className="text-caption font-normal text-text-muted">{format.relativeTime(new Date(n.created_at), new Date())}</span>
                      </span>
                      {!n.read_at && <span aria-label={t("unread")} role="img" className="mt-2 size-2 flex-none rounded-full bg-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
