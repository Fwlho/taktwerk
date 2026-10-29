"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { ChannelMono } from "@/components/domain/ChannelChip";
import { POST_STATUS_DOT } from "@/components/domain/StatusBadge";
import { cx } from "@/lib/cx";
import { postDay } from "@/lib/calendar";
import type { PostListRow } from "@/server/posts/queries";

/** Beitrag im Kalender: Monogramm · Titel · Uhrzeit · Statuspunkt (CalendarEntry) */
export function CalendarEntry({
  slug,
  post,
  variant = "inline",
  draggable,
  past,
  style,
  overlay,
}: {
  slug: string;
  post: PostListRow;
  variant?: "inline" | "block";
  draggable: boolean;
  past?: boolean;
  style?: React.CSSProperties;
  overlay?: boolean;
}) {
  const t = useTranslations("posts");
  const tc = useTranslations("calendar");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: post.id, disabled: !draggable || overlay });
  const { time } = postDay(post);
  const published = post.status === "published" || post.status === "evaluated";
  const statusLabel = t(`status.${post.status}`);

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      style={style}
      className={cx(
        "group relative flex overflow-hidden rounded-sm border text-caption leading-4 text-text",
        variant === "inline" ? "min-h-[26px] items-center gap-1.5 py-[3px] pr-1.5 pl-1" : "min-h-11 flex-col gap-0.5 px-2 py-1.5",
        post.publish_error
          ? "border-danger bg-danger-soft"
          : post.status === "in_review"
            ? "border-dashed border-status-review bg-surface"
            : published
              ? "border-border bg-surface-sunken"
              : "border-border bg-surface",
        "hover:border-border-strong hover:shadow-sm has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-focus",
        isDragging && "opacity-40",
        overlay && "-rotate-2 border-primary shadow-md",
        past && "opacity-80",
        draggable && "touch-manipulation",
      )}
    >
      <span className={cx("flex min-w-0 items-center gap-1.5", variant === "block" && "w-full")}>
        {post.channels && <ChannelMono type={post.channels.type} size="sm" />}
        <Link
          href={`/o/${slug}/posts/${post.id}`}
          draggable={false}
          className={cx("min-w-0 flex-1 outline-none after:absolute after:inset-0", variant === "inline" ? "truncate" : "line-clamp-2")}
          title={`${post.title || t("untitled")} · ${statusLabel}`}
        >
          {post.title || t("untitled")}
        </Link>
        {variant === "inline" && (time || post.publish_error) && (
          <span className={cx("flex-none tabular-nums", post.publish_error ? "font-semibold text-danger" : "font-normal text-text-muted")}>
            {post.publish_error ? tc("failed") : time}
          </span>
        )}
        <span aria-label={statusLabel} role="img" className={cx("size-2 flex-none rounded-full", POST_STATUS_DOT[post.status])} />
      </span>
      {variant === "block" && time && <span className="font-normal text-text-muted tabular-nums">{time}</span>}
    </div>
  );
}
