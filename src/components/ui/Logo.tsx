import { cx } from "@/lib/cx";

/** Taktwerk-Zeichen: drei Balken, der dritte apricot. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cx("inline-flex size-7 flex-none items-center justify-center rounded-[8px] bg-primary", className)}>
      <i className="mx-[1.5px] block h-2 w-1 rounded-[2px] bg-on-primary" />
      <i className="mx-[1.5px] block h-3.5 w-1 rounded-[2px] bg-on-primary" />
      <i className="mx-[1.5px] block h-2.5 w-1 rounded-[2px] bg-accent" />
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("flex items-center gap-2 font-display text-[19px] font-bold tracking-[-0.01em]", className)}>
      <LogoMark />
      Taktwerk
    </span>
  );
}
