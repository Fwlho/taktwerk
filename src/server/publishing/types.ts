// Einheitliche Schnittstelle für alle Plattformen. Neue Anbieter = neue Klasse, die übrige App bleibt gleich.
import type { PublishErrorCode } from "@/lib/publishing";

export type MediaFile = { data: Buffer; mimeType: string; fileName: string };

export type PublishInput = {
  text: string;
  images: MediaFile[];
  /** Videos werden noch nicht unterstützt – der Anbieter meldet dann „videoUnsupported“ */
  hasVideo: boolean;
};

export type PublishResult = { externalId: string; url: string | null };

export type PostMetrics = { reactions: number | null; comments: number | null; shares: number | null };

export interface PublishingProvider<C = unknown> {
  /** Kennung, gespeichert in channels.provider */
  readonly id: string;
  publish(credentials: C, input: PublishInput): Promise<PublishResult>;
  /** Nur für Anbieter mit eigener Planung; sonst plant Taktwerk selbst (claim_due_posts). */
  schedule?(credentials: C, input: PublishInput, at: Date): Promise<PublishResult>;
  fetchMetrics(credentials: C, externalId: string): Promise<PostMetrics>;
}

/**
 * Fehler beim Veröffentlichen. code wird übersetzt angezeigt (posts.publishErrors.*),
 * detail ist die Meldung der Plattform (nur bei „rejected“).
 * retry: später erneut versuchen · expired: Verbindung ungültig → „Neu verbinden“.
 */
export class PublishError extends Error {
  constructor(
    readonly code: PublishErrorCode,
    readonly retry: boolean,
    readonly detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
  }

  get expired() {
    return this.code === "expired";
  }
}
