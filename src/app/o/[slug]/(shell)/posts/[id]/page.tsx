import { notFound } from "next/navigation";
import { PostEditor } from "@/components/posts/PostEditor";
import { listAssets, listAssetsForPost } from "@/server/assets/queries";
import { requireNavAccess } from "@/server/auth/nav-access";
import { listCampaigns } from "@/server/campaigns/queries";
import { listChannels } from "@/server/channels/queries";
import { listMembers } from "@/server/organizations/queries";
import { getPost, getPostThread, listGroupSiblings } from "@/server/posts/queries";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { organization } = await requireNavAccess(slug, "posts");
  const post = await getPost(organization.id, id);
  return { title: post?.title || undefined };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { organization, role, user } = await requireNavAccess(slug, "posts");
  const post = await getPost(organization.id, id);
  if (!post) notFound();
  const [thread, channels, campaigns, members, siblings, media, library] = await Promise.all([
    getPostThread(organization.id, id),
    listChannels(organization.id),
    role === "external" ? Promise.resolve([]) : listCampaigns(organization.id),
    listMembers(organization.id),
    listGroupSiblings(organization.id, post.group_id, post.id),
    listAssetsForPost(organization.id, post.id),
    listAssets(organization.id),
  ]);

  // Externe sehen ggf. nur die Kampagne ihres Beitrags
  const campaignOptions =
    role === "external"
      ? post.campaigns
        ? [{ id: post.campaigns.id, name: post.campaigns.name }]
        : []
      : campaigns.map((c) => ({ id: c.id, name: c.name }));

  return (
    <PostEditor
      key={post.id}
      slug={slug}
      post={post}
      thread={thread}
      role={role}
      userId={user.id}
      organizationName={organization.name}
      channels={channels.map((c) => ({ id: c.id, type: c.type, name: c.name }))}
      campaigns={campaignOptions}
      members={members.map((m) => ({ userId: m.userId, fullName: m.fullName, role: m.role }))}
      siblings={siblings}
      media={media}
      library={library}
    />
  );
}
