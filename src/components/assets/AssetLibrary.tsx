"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, LoaderCircle, Search, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { TextArea, TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { ACCEPTED_MIME, ASSET_KINDS, formatBytes, type AssetKind } from "@/lib/assets";
import { cx } from "@/lib/cx";
import type { MemberRole } from "@/server/db/database.types";
import { deleteAsset, updateAsset } from "@/server/assets/actions";
import type { AssetItem } from "@/server/assets/queries";
import { AssetThumb, AssetTile } from "./AssetTile";
import { useAssetUpload, type UploadState } from "./useAssetUpload";

export function UploadZone({
  onFiles,
  uploads,
  busy,
  compact,
}: {
  onFiles: (files: FileList) => void;
  uploads: UploadState[];
  busy: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("assets");
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
        }}
        className={cx(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center",
          compact ? "h-24 px-4" : "h-36 px-6",
          over ? "border-primary bg-primary-soft" : "border-border-strong",
        )}
      >
        <Button
          icon={busy ? <LoaderCircle className="animate-[tw-spin_.8s_linear_infinite]" /> : <Upload aria-hidden />}
          onClick={() => input.current?.click()}
          disabled={busy}
          size={compact ? "sm" : "md"}
        >
          {t("upload")}
        </Button>
        <p className="text-small text-text-muted">{t("dropHint")}</p>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPTED_MIME.join(",")}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files?.length) onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {uploads.length > 0 && (
        <ul className="flex flex-col gap-1" aria-live="polite">
          {uploads.map((u) => (
            <li key={u.name} className="flex items-center gap-2 text-small">
              {u.status === "uploading" ? (
                <LoaderCircle aria-hidden className="icon-sm animate-[tw-spin_.8s_linear_infinite] text-text-muted" />
              ) : u.status === "error" ? (
                <CircleAlert aria-hidden className="icon-sm text-danger" />
              ) : null}
              <span className="truncate">{u.name}</span>
              {u.message && <span className="text-danger">– {u.message}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AssetLibrary({ slug, organizationId, role, assets }: { slug: string; organizationId: string; role: MemberRole; assets: AssetItem[] }) {
  const t = useTranslations("assets");
  const te = useTranslations("errors");
  const toast = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | AssetKind>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<AssetItem | null>(null);
  const [fileName, setFileName] = useState("");
  const [altText, setAltText] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const canUpload = role !== "viewer";
  const { upload, uploads, busy } = useAssetUpload({ slug, organizationId, onDone: () => router.refresh() });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => (filter === "all" || a.kind === filter) && (!q || a.file_name.toLowerCase().includes(q) || a.alt_text?.toLowerCase().includes(q)));
  }, [assets, filter, query]);

  function openAsset(a: AssetItem) {
    setOpen(a);
    setFileName(a.file_name);
    setAltText(a.alt_text ?? "");
  }

  return (
    <>
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-body text-text-muted">{t("intro")}</p>
      </header>

      {canUpload && (
        <div className="mb-6">
          <UploadZone onFiles={upload} uploads={uploads} busy={busy} />
        </div>
      )}

      {assets.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface">
          <EmptyState kind="first-use" title={t("emptyTitle")} text={t("emptyText")} />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div role="tablist" aria-label={t("filter")} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-md bg-surface-sunken p-[3px]">
              {(["all", ...ASSET_KINDS] as const).map((k) => (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  aria-selected={filter === k}
                  onClick={() => setFilter(k)}
                  className={cx("h-[34px] rounded-[8px] px-4 text-label whitespace-nowrap", filter === k ? "bg-surface shadow-sm" : "text-text-muted hover:text-text")}
                >
                  {k === "all" ? t("all") : t(`kindsPlural.${k}`)}
                </button>
              ))}
            </div>
            <label className="relative ml-auto flex min-w-48 flex-1 items-center tablet:max-w-72 tablet:flex-none">
              <span className="sr-only">{t("search")}</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 text-text-muted icon-sm" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                className="h-10 w-full rounded-md border border-border-strong bg-surface pr-3 pl-9 text-body hover:border-text focus-visible:border-focus"
              />
            </label>
          </div>
          {visible.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyState
                kind="no-results"
                title={t("noResults")}
                actions={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFilter("all");
                      setQuery("");
                    }}
                  >
                    {t("resetFilter")}
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 tablet:grid-cols-3 desktop:grid-cols-5">
              {visible.map((a) => (
                <li key={a.id}>
                  <AssetTile asset={a} onOpen={() => openAsset(a)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Modal
        open={open !== null && !confirm}
        onClose={() => setOpen(null)}
        size="lg"
        busy={pending}
        title={open?.file_name ?? ""}
        subtitle={open ? `${t(`kinds.${open.kind}`)} · ${formatBytes(open.size_bytes)}${open.width ? ` · ${open.width}×${open.height}` : ""}` : undefined}
        footer={
          open &&
          role !== "viewer" && (
            <>
              <Button variant="ghost" icon={<Trash2 aria-hidden />} onClick={() => setConfirm(true)} className="mr-auto text-text-muted">
                {t("delete")}
              </Button>
              <Button
                variant="primary"
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await updateAsset(slug, open.id, { fileName, altText });
                    if (res.error) return toast({ kind: "error", title: te(res.error) });
                    toast({ kind: "success", title: t("saved") });
                    setOpen(null);
                    router.refresh();
                  })
                }
              >
                {t("save")}
              </Button>
            </>
          )
        }
      >
        {open && (
          <>
            <AssetThumb asset={open} className="max-h-80 rounded-md" />
            {open.kind === "video" && open.url && <video src={open.url} controls className="w-full rounded-md" />}
            {open.kind === "document" && open.url && (
              <a href={open.url} target="_blank" rel="noreferrer" className="text-label text-primary hover:underline">
                {t("openFile")}
              </a>
            )}
            <TextField label={t("fileName")} value={fileName} onChange={(e) => setFileName(e.target.value)} readOnly={role === "viewer"} />
            <TextArea
              label={t("altText")}
              optional
              hint={t("altHint")}
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              readOnly={role === "viewer"}
            />
            {open.usedIn > 0 && <Banner kind="info">{t("usedInHint", { count: open.usedIn })}</Banner>}
          </>
        )}
      </Modal>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        variant="danger"
        size="sm"
        busy={pending}
        icon={<Trash2 />}
        title={t("deleteTitle")}
        footer={
          <>
            <Button onClick={() => setConfirm(false)} disabled={pending} data-autofocus>
              {t("keep")}
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  if (!open) return;
                  const res = await deleteAsset(slug, open.id);
                  setConfirm(false);
                  if (res.error) return toast({ kind: "error", title: te(res.error) });
                  setOpen(null);
                  toast({ kind: "success", title: t("deleted") });
                  router.refresh();
                })
              }
            >
              {t("delete")}
            </Button>
          </>
        }
      >
        <p className="text-body text-text-muted">{open && open.usedIn > 0 ? t("deleteUsedText", { count: open.usedIn }) : t("deleteText")}</p>
      </Modal>
    </>
  );
}
