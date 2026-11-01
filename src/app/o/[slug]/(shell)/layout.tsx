import type { ReactNode } from "react";
import { MobileNav } from "@/components/nav/MobileNav";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { SidebarNav } from "@/components/nav/SidebarNav";
import { getOrgContext } from "@/server/auth/session";
import { countPendingApprovals, countUnreadNotifications } from "@/server/posts/queries";

export default async function ShellLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, organization, role } = await getOrgContext(slug);
  const [pendingApprovals, unreadNotifications] = await Promise.all([
    role === "owner" || role === "editor" ? countPendingApprovals(organization.id) : Promise.resolve(0),
    countUnreadNotifications(organization.id, user.id),
  ]);

  return (
    <div className="flex min-h-dvh bg-bg">
      <SidebarNav
        slug={slug}
        role={role}
        userName={user.fullName || user.email}
        organizationName={organization.name}
        pendingApprovals={pendingApprovals}
        unreadNotifications={unreadNotifications}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar
          slug={slug}
          organizationName={organization.name}
          userName={user.fullName || user.email}
          role={role}
          unreadNotifications={unreadNotifications}
        />
        <main
          id="main"
          className="mx-auto w-full max-w-(--size-content-max) flex-1 px-4 pt-6 pb-[calc(var(--size-bottom-nav)+env(safe-area-inset-bottom)+var(--space-6))] tablet:px-8 tablet:pt-8 tablet:pb-8"
        >
          {children}
        </main>
      </div>
      <MobileNav slug={slug} role={role} pendingApprovals={pendingApprovals} />
    </div>
  );
}
