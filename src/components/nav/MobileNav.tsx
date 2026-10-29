"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CircleCheckBig, Flag, Lightbulb, Menu, PenLine, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MemberRole } from "@/server/db/database.types";
import { cx } from "@/lib/cx";
import { Modal } from "@/components/ui/Modal";
import { HOME_ICON, homePath, isActive, navItemsFor } from "./nav-items";

export type MobileNavProps = { slug: string; role: MemberRole; pendingApprovals: number };

const itemCls =
  "relative flex flex-col items-center justify-center gap-0.5 text-caption text-text-muted aria-[current=page]:text-primary";
const pillCls = "flex h-[30px] w-14 items-center justify-center rounded-full transition-colors duration-(--duration-fast)";

/** Untere Navigationsleiste unter bp-tablet: Start · Kalender · Neu · Freigaben · Mehr */
export function MobileNav({ slug, role, pendingApprovals }: MobileNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const base = `/o/${slug}`;
  const [sheet, setSheet] = useState<"create" | "more" | null>(null);

  const items = navItemsFor(role);
  const calendar = items.find((i) => i.key === "calendar");
  const approvals = items.find((i) => i.key === "approvals");
  const home = homePath(slug, role);
  const homeActive = pathname === home;
  const canCreate = role !== "viewer";
  const moreItems = items.filter((i) => !["dashboard", "calendar", "approvals"].includes(i.key));

  return (
    <>
      <nav
        aria-label={t("label")}
        className="fixed inset-x-0 bottom-0 z-(--z-nav) grid h-[calc(var(--size-bottom-nav)+env(safe-area-inset-bottom))] grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] tablet:hidden"
      >
        <Link href={home} aria-current={homeActive ? "page" : undefined} className={itemCls}>
          <span className={cx(pillCls, homeActive && "bg-primary-soft")}>
            <HOME_ICON aria-hidden />
          </span>
          {t("mobile.home")}
        </Link>

        {calendar ? (
          <Link href={base + calendar.path} aria-current={isActive(pathname, base, calendar) ? "page" : undefined} className={itemCls}>
            <span className={cx(pillCls, isActive(pathname, base, calendar) && "bg-primary-soft")}>
              <CalendarDays aria-hidden />
            </span>
            {t("items.calendar")}
          </Link>
        ) : (
          <span />
        )}

        {canCreate ? (
          <button type="button" onClick={() => setSheet("create")} className={itemCls}>
            <span className="flex h-8 w-12 items-center justify-center rounded-md bg-primary text-on-primary">
              <Plus aria-hidden />
            </span>
            {t("mobile.create")}
          </button>
        ) : (
          <span />
        )}

        {approvals ? (
          <Link href={base + approvals.path} aria-current={isActive(pathname, base, approvals) ? "page" : undefined} className={itemCls}>
            <span className={cx(pillCls, isActive(pathname, base, approvals) && "bg-primary-soft")}>
              <CircleCheckBig aria-hidden />
            </span>
            {pendingApprovals > 0 && (
              <span className="absolute top-1.5 left-[calc(50%+8px)] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-status-review px-1 text-caption text-surface shadow-[0_0_0_2px_var(--color-surface)]">
                {pendingApprovals}
                <span className="sr-only"> {t("pendingApprovals")}</span>
              </span>
            )}
            {t("items.approvals")}
          </Link>
        ) : (
          <span />
        )}

        <button type="button" onClick={() => setSheet("more")} className={itemCls}>
          <span className={pillCls}>
            <Menu aria-hidden />
          </span>
          {t("mobile.more")}
        </button>
      </nav>

      <Modal open={sheet === "more"} onClose={() => setSheet(null)} title={t("mobile.more")}>
        <ul className="flex flex-col gap-1">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={base + item.path}
                  onClick={() => setSheet(null)}
                  aria-current={isActive(pathname, base, item) ? "page" : undefined}
                  className="flex h-12 items-center gap-3 rounded-md px-3 text-label text-text hover:bg-surface-hover aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary"
                >
                  <Icon aria-hidden />
                  {t(`items.${item.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </Modal>

      <Modal open={sheet === "create"} onClose={() => setSheet(null)} title={t("mobile.createTitle")} subtitle={t("mobile.createSoon")}>
        <ul className="flex flex-col gap-1">
          {[
            { key: "post", icon: PenLine },
            { key: "idea", icon: Lightbulb },
            { key: "campaign", icon: Flag },
          ].map(({ key, icon: Icon }) => (
            <li key={key}>
              <button
                type="button"
                disabled
                className="flex h-12 w-full items-center gap-3 rounded-md px-3 text-label text-text-disabled"
              >
                <Icon aria-hidden />
                {t(`mobile.createOptions.${key}`)}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
