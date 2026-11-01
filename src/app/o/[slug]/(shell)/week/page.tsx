import { getTranslations } from "next-intl/server";
import { WeekPlanner, type WeekView } from "@/components/week/WeekPlanner";
import { startOfWeek } from "@/lib/calendar";
import { todayBerlin } from "@/lib/format";
import { requireNavAccess } from "@/server/auth/nav-access";
import { listChannels } from "@/server/channels/queries";
import { listMembers } from "@/server/organizations/queries";
import { readPreference } from "@/server/preferences-read";
import { getWeekData } from "@/server/week/queries";

export async function generateMetadata() {
  const tn = await getTranslations("nav.items");
  return { title: tn("week") };
}

export default async function WeekPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ date?: string }> }) {
  const { slug } = await params;
  const { date } = await searchParams;
  const { organization, role, user } = await requireNavAccess(slug, "week");
  const weekStart = startOfWeek(/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date! : todayBerlin());
  const [data, channels, members, view] = await Promise.all([
    getWeekData(organization.id, weekStart),
    listChannels(organization.id),
    listMembers(organization.id),
    readPreference<WeekView>(organization.id, user.id, "week.view", "platform"),
  ]);
  return (
    <WeekPlanner
      key={weekStart}
      slug={slug}
      role={role}
      weekStart={weekStart}
      view={view === "day" ? "day" : "platform"}
      data={data}
      channels={channels.map((c) => ({ id: c.id, type: c.type, name: c.name }))}
      members={members.map((m) => ({ userId: m.userId, fullName: m.fullName, role: m.role }))}
    />
  );
}
