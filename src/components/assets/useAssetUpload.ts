"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { kindForMime, maxBytesFor, safeFileName } from "@/lib/assets";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { registerAsset } from "@/server/assets/actions";

export type UploadState = { name: string; status: "uploading" | "done" | "error"; message?: string };

/** JPEG-Fotos neu kodieren: entfernt Metadaten wie GPS-Standort (Datensparsamkeit). */
async function stripJpegMetadata(file: File): Promise<File> {
  if (file.type !== "image/jpeg") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
    return new File([blob], file.name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function readDimensions(file: File): Promise<{ width: number | null; height: number | null; durationS: number | null }> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { width: img.naturalWidth || null, height: img.naturalHeight || null, durationS: null };
    }
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("video"));
      });
      return {
        width: video.videoWidth || null,
        height: video.videoHeight || null,
        durationS: Number.isFinite(video.duration) ? Math.round(video.duration * 100) / 100 : null,
      };
    }
  } catch {
    // Maße sind optional
  } finally {
    URL.revokeObjectURL(url);
  }
  return { width: null, height: null, durationS: null };
}

/** Dateien direkt in den privaten Speicher (Frankfurt) hochladen und in der Mediathek eintragen. */
export function useAssetUpload({ slug, organizationId, postId, onDone }: { slug: string; organizationId: string; postId?: string; onDone?: () => void }) {
  const t = useTranslations("assets");
  const te = useTranslations("errors");
  const toast = useToast();
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const set = (name: string, patch: Partial<UploadState>) =>
    setUploads((u) => u.map((x) => (x.name === name ? { ...x, ...patch } : x)));

  async function uploadOne(original: File) {
    const kind = kindForMime(original.type);
    if (!kind) {
      set(original.name, { status: "error", message: t("wrongType") });
      return false;
    }
    if (original.size > maxBytesFor(kind)) {
      set(original.name, { status: "error", message: t(kind === "video" ? "tooLargeVideo" : "tooLarge") });
      return false;
    }
    const file = await stripJpegMetadata(original);
    const dims = await readDimensions(file);
    const path = `${organizationId}/${crypto.randomUUID()}/${safeFileName(file.name)}`;
    const { error } = await supabaseBrowser().storage.from("assets").upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      set(original.name, { status: "error", message: t("uploadFailed") });
      return false;
    }
    const res = await registerAsset(
      slug,
      { storagePath: path, fileName: original.name, mimeType: file.type as never, sizeBytes: file.size, ...dims },
      postId,
    );
    if (res.error) {
      set(original.name, { status: "error", message: te(res.error) });
      return false;
    }
    set(original.name, { status: "done" });
    return true;
  }

  async function upload(files: FileList | File[]) {
    const list = [...files].slice(0, 20);
    if (list.length === 0) return;
    setUploads(list.map((f) => ({ name: f.name, status: "uploading" })));
    const results = await Promise.all(list.map(uploadOne));
    const ok = results.filter(Boolean).length;
    if (ok) toast({ kind: "success", title: t("uploaded", { count: ok }) });
    if (ok < list.length) toast({ kind: "error", title: t("someFailed", { count: list.length - ok }) });
    onDone?.();
    setTimeout(() => setUploads((u) => u.filter((x) => x.status === "error")), 1500);
  }

  return { upload, uploads, busy: uploads.some((u) => u.status === "uploading") };
}
