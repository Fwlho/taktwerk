"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cx } from "@/lib/cx";

export function SettingsTabs({ slug, tabs }: { slug: string; tabs: Array<"company" | "team" | "account"> }) {
  const t = useTranslations("settings.tabs");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-md bg-surface-sunken p-[3px]">
      {tabs.map((tab) => {
        const href = `/o/${slug}/settings/${tab}`;
        const active = pathname === href;
        return (
          <Link
            key={tab}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "inline-flex h-[34px] items-center rounded-[8px] px-4 text-label whitespace-nowrap",
              active ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text",
            )}
          >
            {t(tab)}
          </Link>
        );
      })}
    </nav>
  );
}
