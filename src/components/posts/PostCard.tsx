"use client";

import Link from "next/link";
import { forwardRef, type HTMLAttributes } from "react";
import { CalendarClock, CircleAlert, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChannelChip } from "@/components/domain/ChannelChip";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { cx } from "@/lib/cx";
import { formatDateTime, formatDayMonth } from "@/lib/format";
import type { PostListRow } from "@/server/posts/queries";

export type MemberInfo = { userId: string; fullName: string; role: string };

export const PostCard = forwardRef<
  HTMLDivElement,
  {
    slug: string;
    post: PostListRow;
    members: Map<string, MemberInfo>;
    showStatus?: boolean;
    dragging?: boolean;
    className?: string;
  } & HTMLAttributes<HTMLDivElement>
>(function PostCard({ slug, post, members, showStatus = true, dragging, className, ...rest }, ref) {
  const t = useTranslations("posts");
  const tc = useTranslations("channels.types");
  const assigneeId = post.post_assignees[0]?.user_id ?? post.created_by;
  const assignee = assigneeId ? members.get(assigneeId) : undefined;
  const commentCount = post.comments[0]?.count ?? 0;
  const excerpt = post.body.trim().slice(0, 200);

  return (
    <div
      ref={ref}
      {...rest}
      className={cx(
        "group relative flex flex-col gap-2 rounded-lg border bg-surface p-4 text-left transition-[box-shadow,border-color] duration-(--duration-fast) ease-standard",
        post.publish_error ? "border-danger" : "border-border hover:border-border-strong hover:shadow-sm",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus",
        dragging && "-rotate-[1.5deg] shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {post.channels && <ChannelChip type={post.channels.type} label={tc(post.channels.type)} compact />}
        {showStatus && <StatusBadge status={post.status} />}
      </div>
      <Link
        href={`/o/${slug}/posts/${post.id}`}
        className="line-clamp-2 text-[15px] leading-[21px] font-bold outline-none after:absolute after:inset-0 after:content-['']"
        draggable={false}
      >
        {post.title || t("untitled")}
      </Link>
      {excerpt && <p className="line-clamp-2 text-small text-text-muted">{excerpt}</p>}
      {post.campaigns && <p className="text-caption text-text-muted">{post.campaigns.name}</p>}
      {post.publish_error && (
        <p className="flex items-center gap-1 text-small font-semibold text-danger">
          <CircleAlert aria-hidden className="icon-sm" />
          {post.publish_error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2 text-small text-text-muted">
        <span className="inline-flex items-center gap-1">
          <CalendarClock aria-hidden className="icon-sm" />
          {post.scheduled_at ? formatDateTime(post.scheduled_at) : post.planned_on ? formatDayMonth(post.planned_on) : t("noDate")}
        </span>
        <span className="inline-flex items-center gap-2">
          {commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare aria-hidden className="icon-sm" />
              {commentCount}
              <span className="sr-only">{t("comments")}</span>
            </span>
          )}
          {assignee && <Avatar name={assignee.fullName} external={assignee.role === "external"} />}
        </span>
      </div>
    </div>
  );
});
