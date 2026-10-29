// Regeln für Dateien in der Mediathek (gleich wie Bucket und Tabelle in der Migration)

export const ASSET_KINDS = ["image", "video", "logo", "document"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const ACCEPTED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
] as const;

export function kindForMime(mime: string): AssetKind | null {
  if (!(ACCEPTED_MIME as readonly string[]).includes(mime)) return null;
  if (mime === "image/svg+xml") return "logo";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

export function maxBytesFor(kind: AssetKind) {
  return kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

/** Dateiname für den Speicherpfad: nur sichere Zeichen, Endung bleibt */
export function safeFileName(name: string): string {
  const map: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss" };
  const cleaned = name
    .replace(/[äöüÄÖÜß]/g, (c) => map[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "");
  return (cleaned || "datei").slice(-100);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
