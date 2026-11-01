"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Images, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { linkAssets, unlinkAsset } from "@/server/assets/actions";
import type { AssetItem } from "@/server/assets/queries";
import { UploadZone } from "./AssetLibrary";
import { AssetThumb, AssetTile } from "./AssetTile";
import { useAssetUpload } from "./useAssetUpload";

/** Medien eines Beitrags: verknüpfte Dateien, Upload, Auswahl aus der Mediathek */
export function PostMedia({
  slug,
  organizationId,
  postId,
  linked,
  library,
  readOnly,
}: {
  slug: string;
  organizationId: string;
  postId: string;
  linked: AssetItem[];
  library: AssetItem[];
  readOnly: boolean;
}) {
  const t = useTranslations("assets");
  const te = useTranslations("errors");
  const toast = useToast();
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const { upload, uploads, busy } = useAssetUpload({ slug, organizationId, postId, onDone: () => router.refresh() });
  const linkedIds = new Set(linked.map((a) => a.id));
  const choices = library.filter((a) => !linkedIds.has(a.id));

  return (
    <section aria-labelledby="media-h" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="media-h" className="text-label">
          {t("postMedia")}
        </h2>
        {!readOnly && choices.length > 0 && (
          <Button size="sm" variant="ghost" icon={<Images className="icon-sm" />} onClick={() => setPicking(true)}>
            {t("fromLibrary")}
          </Button>
        )}
      </div>
      {linked.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 tablet:grid-cols-4">
          {linked.map((a) => (
            <li key={a.id} className="relative">
              <AssetThumb asset={a} className="aspect-square rounded-md" />
              {!readOnly && (
                <button
                  type="button"
                  aria-label={t("unlink", { name: a.file_name })}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await unlinkAsset(slug, postId, a.id);
                      if (res.error) toast({ kind: "error", title: te(res.error) });
                      router.refresh();
                    })
                  }
                  className="absolute top-1 right-1 inline-flex size-7 items-center justify-center rounded-full bg-surface text-text shadow-sm hover:bg-surface-hover"
                >
                  <X className="icon-sm" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && <UploadZone onFiles={upload} uploads={uploads} busy={busy} compact />}

      <Modal
        open={picking}
        onClose={() => setPicking(false)}
        size="lg"
        busy={pending}
        icon={<Images />}
        title={t("pickTitle")}
        footer={
          <>
            <Button onClick={() => setPicking(false)} disabled={pending}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={selected.length === 0}
              onClick={() =>
                startTransition(async () => {
                  const res = await linkAssets(slug, postId, selected);
                  if (res.error) return toast({ kind: "error", title: te(res.error) });
                  setSelected([]);
                  setPicking(false);
                  router.refresh();
                })
              }
            >
              {t("pickSubmit", { count: selected.length })}
            </Button>
          </>
        }
      >
        {choices.length === 0 ? (
          <EmptyState kind="no-results" inline title={t("emptyTitle")} />
        ) : (
          <ul className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto tablet:grid-cols-3">
            {choices.map((a) => (
              <li key={a.id}>
                <AssetTile
                  asset={a}
                  selectable
                  selected={selected.includes(a.id)}
                  onOpen={() => setSelected((s) => (s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id]))}
                />
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </section>
  );
}
