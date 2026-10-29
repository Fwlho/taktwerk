"use client";

import Link from "next/link";
import { ArrowLeftRight, LogOut, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { signOut } from "@/app/(auth)/actions";
import { cx } from "@/lib/cx";

const itemCls =
  "flex h-10 w-full items-center gap-2 rounded-sm px-3 text-left text-body text-text hover:bg-surface-hover focus-visible:bg-surface-hover";

/** Kontomenü (Popover). `id` muss pro Seite eindeutig sein. */
export function AccountMenu({ id, slug, className }: { id: string; slug: string; className?: string }) {
  const t = useTranslations("nav.account");
  return (
    <div
      id={id}
      popover="auto"
      className={cx(
        "fixed inset-auto m-0 min-w-56 rounded-md border border-border bg-surface p-1 text-text shadow-md",
        className,
      )}
    >
      <Link href={`/o/${slug}/settings/account`} className={itemCls}>
        <UserRound aria-hidden className="icon-sm" />
        {t("account")}
      </Link>
      <Link href="/start?choose=1" className={itemCls}>
        <ArrowLeftRight aria-hidden className="icon-sm" />
        {t("switchOrganization")}
      </Link>
      <form action={signOut}>
        <button type="submit" className={itemCls}>
          <LogOut aria-hidden className="icon-sm" />
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
