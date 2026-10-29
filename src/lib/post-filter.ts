import type { ChannelType } from "./domain";

export type PostFilterState = { q: string; campaign: string; person: string; hidden: ChannelType[] };
export const EMPTY_FILTER: PostFilterState = { q: "", campaign: "", person: "", hidden: [] };

type Filterable = {
  title: string;
  body: string;
  campaign_id: string | null;
  created_by: string | null;
  post_assignees: { user_id: string }[];
  channels: { type: ChannelType } | null;
};

export function applyPostFilter<T extends Filterable>(posts: T[], f: PostFilterState): T[] {
  const q = (f.q ?? "").trim().toLowerCase();
  const hidden = f.hidden ?? [];
  return posts.filter(
    (p) =>
      (!q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)) &&
      (!f.campaign || p.campaign_id === f.campaign) &&
      (!f.person || p.created_by === f.person || p.post_assignees.some((a) => a.user_id === f.person)) &&
      (!p.channels || !hidden.includes(p.channels.type)),
  );
}
