import "server-only";
import { randomUUID } from "node:crypto";
import { PublishError, type PostMetrics, type PublishInput, type PublishResult, type PublishingProvider } from "./types";

/** Testbetrieb ohne echte Plattform (PUBLISH_FAKE=1): Browser-Tests posten nie wirklich. */
export function publishFake(): boolean {
  return process.env.PUBLISH_FAKE === "1";
}

export const FAKE_PAGES = [
  { id: "fake-page-1", name: "Testseite Malerei", accessToken: "fake-token-1" },
  { id: "fake-page-2", name: "Testseite Café", accessToken: "fake-token-2" },
];

export class FakeProvider implements PublishingProvider<{ pageId: string; pageName: string; accessToken: string }> {
  readonly id = "fake";

  async publish(_c: unknown, input: PublishInput): Promise<PublishResult> {
    if (input.hasVideo) throw new PublishError("videoUnsupported", false);
    // Text „#fehler“ erzeugt zum Testen eine Ablehnung der Plattform
    if (input.text.includes("#fehler")) throw new PublishError("rejected", false, "Test: Beitrag abgelehnt");
    if (!input.text.trim() && input.images.length === 0) throw new PublishError("emptyPost", false);
    const id = `fake_${randomUUID()}`;
    return { externalId: id, url: `https://example.com/fake/${id}` };
  }

  async fetchMetrics(): Promise<PostMetrics> {
    return { reactions: 3, comments: 1, shares: 0 };
  }
}
