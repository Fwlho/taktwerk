"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChannelMono } from "@/components/domain/ChannelChip";
import { StatusBadge } from "@/components/domain/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, formatDayMonth } from "@/lib/format";
import type { PostListRow } from "@/server/posts/queries";

export function CampaignPostsTable({ slug, posts }: { slug: string; posts: PostListRow[] }) {
  const t = useTranslations("campaigns");
  return (
    <section aria-labelledby="posts-h" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
      <h2 id="posts-h" className="text-h2">
        {t("postsInCampaign")}
      </h2>
      {posts.length === 0 ? (
        <EmptyState kind="first-use" inline title={t("noPostsTitle")} text={t("noPostsText")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-label font-normal">
            <thead>
              <tr className="border-b border-border text-left text-caption text-text-muted">
                <th scope="col" className="px-3 py-2 font-semibold">
                  {t("table.post")}
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  {t("table.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3">
                    <Link href={`/o/${slug}/posts/${p.id}`} className="flex items-center gap-3 hover:underline">
                      {p.channels && <ChannelMono type={p.channels.type} />}
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold">{p.title || t("untitled")}</span>
                        <span className="text-small text-text-muted">
                          {p.scheduled_at ? formatDateTime(p.scheduled_at) : p.planned_on ? formatDayMonth(p.planned_on) : t("noDate")}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
