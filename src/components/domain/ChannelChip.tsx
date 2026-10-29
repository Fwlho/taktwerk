import { Printer, Check, CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import type { ChannelType } from "@/lib/domain";

const MONOGRAM: Record<Exclude<ChannelType, "offline">, string> = {
  instagram: "IG",
  youtube: "YT",
  linkedin: "in",
  tiktok: "TT",
  facebook: "FB",
};

// Kachelform unterscheidet Kanäle auch ohne Farbe: Instagram 30 %, Facebook Kreis, sonst radius-sm
const monoBg: Record<ChannelType, string> = {
  instagram: "bg-ch-instagram rounded-[30%]",
  facebook: "bg-ch-facebook rounded-full",
  youtube: "bg-ch-youtube rounded-sm",
  linkedin: "bg-ch-linkedin rounded-sm",
  tiktok: "bg-ch-tiktok rounded-sm",
  offline: "bg-ch-offline rounded-sm",
};

const monoSize = {
  sm: "size-[18px] text-[9px] [&_svg]:size-[11px]",
  md: "size-6 text-[11px] [&_svg]:size-[14px]",
  lg: "size-10 text-[15px] [&_svg]:size-6",
};

/** Monogramm-Kachel eines Kanals (keine Plattform-Logos). */
export function ChannelMono({ type, size = "md", off, className }: { type: ChannelType; size?: "sm" | "md" | "lg"; off?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex flex-none items-center justify-center font-display leading-none font-bold tracking-[.02em]",
        off ? "bg-surface-sunken text-text-muted rounded-sm" : cx(monoBg[type], "text-on-channel"),
        monoSize[size],
        size === "lg" && type !== "instagram" && type !== "facebook" && "rounded-md",
        className,
      )}
    >
      {type === "offline" ? <Printer strokeWidth={2.25} /> : MONOGRAM[type]}
    </span>
  );
}

const chipColors: Record<ChannelType, string> = {
  instagram: "bg-ch-instagram-soft text-ch-instagram",
  youtube: "bg-ch-youtube-soft text-ch-youtube",
  linkedin: "bg-ch-linkedin-soft text-ch-linkedin",
  tiktok: "bg-ch-tiktok-soft text-ch-tiktok",
  facebook: "bg-ch-facebook-soft text-ch-facebook",
  offline: "bg-ch-offline-soft text-ch-offline",
};

export type ChannelChipState = "default" | "selected" | "off" | "error" | "disabled";

/** Kanal als Chip: Monogramm + Name auf getönter Fläche. */
export function ChannelChip({
  type,
  label,
  state = "default",
  compact,
  className,
  trailing,
}: {
  type: ChannelType;
  label: string;
  state?: ChannelChipState;
  compact?: boolean;
  className?: string;
  trailing?: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border font-semibold whitespace-nowrap",
        compact ? "h-6 gap-1 pr-2 pl-[3px] text-caption" : "h-8 gap-1.5 pr-3 pl-1 text-small font-semibold",
        state === "off"
          ? "border-dashed border-border-strong bg-transparent text-text-muted"
          : state === "error"
            ? "border-transparent bg-danger-soft text-danger"
            : cx("border-transparent", chipColors[type]),
        state === "selected" && "border-2 border-current",
        state === "disabled" && "opacity-45",
        className,
      )}
    >
      <ChannelMono type={type} size={compact ? "sm" : "md"} off={state === "off"} />
      {label}
      {state === "selected" && <Check aria-hidden className="size-3.5" />}
      {state === "error" && <CircleAlert aria-hidden className="size-3.5" />}
      {trailing}
    </span>
  );
}

/** Gestapelte Monogramme (Kampagnenkarte, Detailkopf) */
export function ChannelStack({ types, size = "md" }: { types: ChannelType[]; size?: "sm" | "md" }) {
  return (
    <span className="flex">
      {types.map((t, i) => (
        <ChannelMono key={t} type={t} size={size} className={cx(i > 0 && "-ml-1", "shadow-[0_0_0_2px_var(--color-surface)]")} />
      ))}
    </span>
  );
}
