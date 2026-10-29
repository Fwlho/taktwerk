import { getTranslations } from "next-intl/server";
import { CalendarView } from "@/components/calendar/CalendarView";
import { CALENDAR_VIEWS, viewRange, type CalendarView as View } from "@/lib/calendar";
import type { ChannelType } from "@/lib/domain";
import { todayBerlin } from "@/lib/format";
import { requireNavAccess } from "@/server/auth/nav-access";
import { listCampaigns } from "@/server/campaigns/queries";
import { listChannels } from "@/server/channels/queries";
import { listMembers } from "@/server/organizations/queries";
import { listPosts } from "@/server/posts/queries";
import { readPreference } from "@/server/preferences-read";

export async function generateMetadata() {
  const tn = await getTranslations("nav.items");
  return { title: tn("calendar") };
}

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { organization, role, user } = await requireNavAccess(slug, "calendar");
  const savedView = await readPreference<View>(organization.id, user.id, "calendar.view", "month");
  const view: View = (CALENDAR_VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : savedView;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : todayBerlin();
  const range = viewRange(view, date);

  const [posts, channels, campaigns, members, hidden] = await Promise.all([
    listPosts(organization.id, range),
    listChannels(organization.id),
    role === "external" ? Promise.resolve([]) : listCampaigns(organization.id),
    listMembers(organization.id),
    readPreference<ChannelType[]>(organization.id, user.id, "calendar.hidden", []),
  ]);

  return (
    <CalendarView
      key={`${view}-${date}`}
      slug={slug}
      role={role}
      view={view}
      date={date}
      posts={posts}
      channels={channels.map((c) => ({ id: c.id, type: c.type, name: c.name }))}
      campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
      members={members.map((m) => ({ userId: m.userId, fullName: m.fullName, role: m.role }))}
      initialHidden={Array.isArray(hidden) ? hidden : []}
    />
  );
}
