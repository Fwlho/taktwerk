"use client";

import { FileText, Film, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cx } from "@/lib/cx";
import { formatBytes } from "@/lib/assets";
import type { AssetItem } from "@/server/assets/queries";

export function AssetThumb({ asset, className }: { asset: Pick<AssetItem, "kind" | "url" | "alt_text" | "file_name" | "mime_type">; className?: string }) {
  const showImage = asset.url && (asset.kind === "image" || asset.kind === "logo");
  return (
    <div className={cx("flex items-center justify-center overflow-hidden bg-surface-sunken text-text-muted", className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- signierte, kurzlebige Links; next/image bringt hier nichts
        <img
          src={asset.url!}
          alt={asset.alt_text ?? ""}
          loading="lazy"
          className={cx("size-full", asset.kind === "logo" ? "object-contain p-3" : "object-cover")}
        />
      ) : asset.kind === "video" && asset.url ? (
        <video src={asset.url} muted preload="metadata" className="size-full object-cover" aria-hidden />
      ) : asset.kind === "video" ? (
        <Film aria-hidden className="size-8" />
      ) : asset.kind === "document" ? (
        <FileText aria-hidden className="size-8" />
      ) : (
        <ImageIcon aria-hidden className="size-8" />
      )}
    </div>
  );
}

export function AssetTile({ asset, onOpen, selected, selectable }: { asset: AssetItem; onOpen: () => void; selected?: boolean; selectable?: boolean }) {
  const t = useTranslations("assets");
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={selectable ? selected : undefined}
      className={cx(
        "flex w-full flex-col overflow-hidden rounded-lg border bg-surface text-left transition-[box-shadow,border-color] duration-(--duration-fast)",
        selected ? "border-2 border-primary" : "border-border hover:border-border-strong hover:shadow-sm",
      )}
    >
      <AssetThumb asset={asset} className="aspect-square w-full" />
      <span className="flex flex-col gap-0.5 p-3">
        <span className="truncate text-label">{asset.file_name}</span>
        <span className="text-caption font-normal text-text-muted">
          {t(`kinds.${asset.kind}`)} · {formatBytes(asset.size_bytes)}
          {asset.usedIn > 0 && <> · {t("usedIn", { count: asset.usedIn })}</>}
        </span>
      </span>
    </button>
  );
}
