import "server-only";
import { notFound, redirect } from "next/navigation";
import { homePath, NAV_ITEMS, type NavItem } from "@/components/nav/nav-items";
import { getOrgContext } from "./session";

/** Seite nur für Rollen, die den Navigationspunkt sehen. Externe landen auf ihrer Startseite. */
export async function requireNavAccess(slug: string, key: NavItem["key"]) {
  const ctx = await getOrgContext(slug);
  const item = NAV_ITEMS.find((i) => i.key === key);
  if (!item?.roles.includes(ctx.role)) {
    if (key === "dashboard") redirect(homePath(slug, ctx.role));
    notFound();
  }
  return ctx;
}
