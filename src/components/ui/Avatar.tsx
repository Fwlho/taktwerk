import { cx } from "@/lib/cx";

export function initials(name: string, fallback = "?"): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, external, size = "md", className }: { name: string; external?: boolean; size?: "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex flex-none items-center justify-center rounded-full font-bold",
        size === "lg" ? "size-9 text-small font-bold" : "size-6 text-[10px]",
        external ? "bg-ch-offline-soft text-ch-offline" : "bg-primary-soft text-primary",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
