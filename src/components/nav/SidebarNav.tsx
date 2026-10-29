"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MemberRole } from "@/server/db/database.types";
import { cx } from "@/lib/cx";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/ui/Logo";
import { AccountMenu } from "./AccountMenu";
import { isActive, navItemsFor } from "./nav-items";

export type SidebarNavProps = {
  slug: string;
  role: MemberRole;
  userName: string;
  organizationName: string;
  pendingApprovals: number;
};

/** Hauptnavigation ab bp-tablet: eingeklappt (72px) bis bp-desktop, darüber 248px mit Labels. */
export function SidebarNav({ slug, role, userName, organizationName, pendingApprovals }: SidebarNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const base = `/o/${slug}`;
  const items = navItemsFor(role);

  const renderItems = (section: "main" | "company") =>
    items
      .filter((i) => i.section === section)
      .map((item) => {
        const active = isActive(pathname, base, item);
        const Icon = item.icon;
        const label = t(`items.${item.key}`);
        return (
          <li key={item.key}>
            <Link
              href={base + item.path}
              aria-current={active ? "page" : undefined}
              title={label}
              className={cx(
                "flex h-11 items-center justify-center gap-3 rounded-md text-label transition-colors duration-(--duration-fast) ease-standard",
                "desktop:h-10 desktop:justify-start desktop:px-3",
                active ? "bg-primary-soft text-primary" : "text-text-muted hover:bg-surface-hover hover:text-text",
              )}
            >
              <Icon aria-hidden />
              <span className="sr-only desktop:not-sr-only">{label}</span>
              {item.key === "approvals" && pendingApprovals > 0 && (
                <span className="ml-auto hidden h-5 min-w-[22px] items-center justify-center rounded-full bg-status-review-soft px-1.5 text-caption font-bold text-status-review desktop:inline-flex">
                  {pendingApprovals}
                  <span className="sr-only"> {t("pendingApprovals")}</span>
                </span>
              )}
            </Link>
          </li>
        );
      });

  const companyItems = renderItems("company");

  return (
    <nav
      aria-label={t("label")}
      className={cx(
        "sticky top-0 z-(--z-nav) hidden h-dvh flex-none flex-col gap-1 border-r border-border bg-surface px-3 py-4 tablet:flex",
        "w-(--size-sidebar-collapsed) desktop:w-(--size-sidebar)",
      )}
    >
      <Link href={base} className="flex items-center justify-center gap-2 pb-5 desktop:justify-start desktop:px-2 desktop:pt-1">
        <LogoMark />
        <span className="sr-only font-display text-[19px] font-bold tracking-[-0.01em] desktop:not-sr-only">Taktwerk</span>
      </Link>
      <ul className="flex flex-col gap-1">{renderItems("main")}</ul>
      {companyItems.length > 0 && (
        <>
          <p className="hidden px-3 pt-4 pb-1 text-caption text-text-muted desktop:block">{t("sectionCompany")}</p>
          <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-4 desktop:mt-0 desktop:border-0 desktop:pt-0">{companyItems}</ul>
        </>
      )}
      <button
        type="button"
        popoverTarget="account-menu-side"
        className="mt-auto flex items-center justify-center gap-3 rounded-md border-t border-border p-3 text-left hover:bg-surface-hover desktop:justify-start"
        aria-label={t("account.open")}
      >
        <Avatar name={userName} size="lg" external={role === "external"} />
        <span className="hidden min-w-0 flex-col desktop:flex">
          <span className="truncate text-label">{userName}</span>
          <span className="truncate text-small text-text-muted">
            {organizationName} · {t(`roles.${role}`)}
          </span>
        </span>
      </button>
      <AccountMenu id="account-menu-side" slug={slug} className="bottom-20 left-3" />
    </nav>
  );
}
