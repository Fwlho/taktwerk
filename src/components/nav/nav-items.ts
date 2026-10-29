import {
  CalendarDays,
  ChartLine,
  CircleCheckBig,
  Columns3,
  Flag,
  House,
  LayoutDashboard,
  Plug,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { MemberRole } from "@/server/db/database.types";

export type NavItem = {
  key: "dashboard" | "calendar" | "campaigns" | "posts" | "approvals" | "reports" | "channels" | "settings";
  /** Pfad relativ zu /o/[slug] */
  path: string;
  icon: LucideIcon;
  roles: readonly MemberRole[];
  section: "main" | "company";
};

const ALL: readonly MemberRole[] = ["owner", "editor", "external", "viewer"];
const INTERNAL: readonly MemberRole[] = ["owner", "editor", "viewer"];

// Reihenfolge und Icons laut design/project/components/SidebarNav
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "dashboard", path: "", icon: LayoutDashboard, roles: INTERNAL, section: "main" },
  { key: "calendar", path: "/calendar", icon: CalendarDays, roles: ALL, section: "main" },
  { key: "campaigns", path: "/campaigns", icon: Flag, roles: ALL, section: "main" },
  { key: "posts", path: "/posts", icon: Columns3, roles: ALL, section: "main" },
  { key: "approvals", path: "/approvals", icon: CircleCheckBig, roles: ["owner", "editor"], section: "main" },
  { key: "reports", path: "/reports", icon: ChartLine, roles: INTERNAL, section: "main" },
  { key: "channels", path: "/channels", icon: Plug, roles: INTERNAL, section: "company" },
  { key: "settings", path: "/settings", icon: Settings, roles: ALL, section: "company" },
];

export const HOME_ICON = House;

export function navItemsFor(role: MemberRole) {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}

/** Startseite je Rolle: Externe haben kein Dashboard. */
export function homePath(slug: string, role: MemberRole) {
  return role === "external" ? `/o/${slug}/posts` : `/o/${slug}`;
}

export function isActive(pathname: string, base: string, item: NavItem) {
  const href = base + item.path;
  return item.path === "" ? pathname === base : pathname === href || pathname.startsWith(href + "/");
}
