import { getTranslations } from "next-intl/server";
import { PipelineBoard } from "@/components/posts/PipelineBoard";
import { EMPTY_FILTER, type PostFilterState } from "@/lib/post-filter";
import { requireNavAccess } from "@/server/auth/nav-access";
import { listCampaigns } from "@/server/campaigns/queries";
import { listChannels } from "@/server/channels/queries";
import { listMembers } from "@/server/organizations/queries";
import { listPosts } from "@/server/posts/queries";
import { readPreference } from "@/server/preferences-read";

export async function generateMetadata() {
  const tn = await getTranslations("nav.items");
  return { title: tn("posts") };
}

export default async function PostsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { organization, role, user } = await requireNavAccess(slug, "posts");
  const [posts, channels, campaigns, members, filter] = await Promise.all([
    listPosts(organization.id),
    listChannels(organization.id),
    listCampaigns(organization.id),
    listMembers(organization.id),
    readPreference<PostFilterState>(organization.id, user.id, "pipeline.filter", EMPTY_FILTER),
  ]);
  return (
    <PipelineBoard
      slug={slug}
      role={role}
      posts={posts}
      members={members.map((m) => ({ userId: m.userId, fullName: m.fullName, role: m.role }))}
      channels={channels.map((c) => ({ id: c.id, type: c.type, name: c.name }))}
      campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
      initialFilter={{ ...EMPTY_FILTER, ...filter }}
    />
  );
}
