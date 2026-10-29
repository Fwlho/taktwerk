import type { ReactNode } from "react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { cx } from "@/lib/cx";

export type BannerKind = "info" | "warning" | "error";

const styles: Record<BannerKind, { cls: string; icon: ReactNode }> = {
  info: { cls: "bg-info-soft [&>svg]:text-info", icon: <Info /> },
  warning: { cls: "bg-warning-soft [&>svg]:text-warning", icon: <TriangleAlert /> },
  error: { cls: "bg-danger-soft [&>svg]:text-danger", icon: <CircleAlert /> },
};

/** Dauerhafter Hinweis im Seiteninhalt. */
export function Banner({
  kind,
  children,
  action,
  icon,
  className,
}: {
  kind: BannerKind;
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const s = styles[kind];
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cx("flex items-center gap-3 rounded-md px-4 py-3 text-label font-normal text-text", s.cls, className)}
    >
      {icon ?? s.icon}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
