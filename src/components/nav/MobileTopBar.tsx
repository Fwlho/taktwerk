"use client";

import { useTranslations } from "next-intl";
import type { MemberRole } from "@/server/db/database.types";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/ui/Logo";
import { AccountMenu } from "./AccountMenu";

/** Obere Leiste unter bp-tablet (56px): Zeichen, Betrieb, Kontomenü. */
export function MobileTopBar({ slug, organizationName, userName, role }: { slug: string; organizationName: string; userName: string; role: MemberRole }) {
  const t = useTranslations("nav");
  return (
    <header className="sticky top-0 z-(--z-nav) flex h-14 flex-none items-center gap-2 border-b border-border bg-surface px-4 pt-[env(safe-area-inset-top)] tablet:hidden">
      <LogoMark />
      <span className="flex-1 truncate font-display text-[18px] font-bold">{organizationName}</span>
      <button
        type="button"
        popoverTarget="account-menu-top"
        aria-label={t("account.open")}
        className="flex size-(--size-control) items-center justify-center rounded-full"
      >
        <Avatar name={userName} external={role === "external"} size="lg" />
      </button>
      <AccountMenu id="account-menu-top" slug={slug} className="top-14 right-4" />
    </header>
  );
}
