import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parsePublishError } from "@/lib/publishing";
import { fromBytea, open, openFromString, seal, sealToString, toBytea } from "@/server/crypto/secrets";
import { FacebookPageProvider, toPublishError } from "@/server/publishing/meta";
import { PublishError } from "@/server/publishing/types";

const key = randomBytes(32);

describe("Verschlüsselung der Zugangsdaten", () => {
  it("ver- und entschlüsselt, jedes Mal mit neuem IV", () => {
    const a = seal("geheim", key);
    const b = seal("geheim", key);
    expect(open(a, key)).toBe("geheim");
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.toString()).not.toContain("geheim");
  });

  it("erkennt veränderte Daten und falschen Schlüssel", () => {
    const s = seal("geheim", key);
    const tampered = { ...s, ciphertext: Buffer.from(s.ciphertext.map((x) => x ^ 1)) };
    expect(() => open(tampered, key)).toThrow();
    expect(() => open(s, randomBytes(32))).toThrow();
  });

  it("Textform fürs Cookie und bytea-Schreibweise", () => {
    expect(openFromString(sealToString("x", key), key)).toBe("x");
    expect(openFromString("kaputt", key)).toBeNull();
    const buf = Buffer.from([0, 255, 16]);
    expect(toBytea(buf)).toBe("\\x00ff10");
    expect(fromBytea(toBytea(buf)).equals(buf)).toBe(true);
  });
});

describe("Fehler beim Veröffentlichen", () => {
  it("gespeicherte Fehler werden zerlegt", () => {
    expect(parsePublishError("rejected: Text zu lang")).toEqual({ code: "rejected", detail: "Text zu lang" });
    expect(parsePublishError("expired")).toEqual({ code: "expired", detail: null });
    expect(parsePublishError("irgendwas")).toEqual({ code: "unknown", detail: "irgendwas" });
    expect(parsePublishError(null)).toBeNull();
  });

  it("Meta-Fehlercodes: abgelaufen, später erneut, abgelehnt", () => {
    expect(toPublishError(400, { error: { code: 190 } }).code).toBe("expired");
    expect(toPublishError(400, { error: { code: 4 } })).toMatchObject({ code: "busy", retry: true });
    expect(toPublishError(503, {})).toMatchObject({ code: "busy", retry: true });
    expect(toPublishError(400, { error: { code: 100, message: "Invalid parameter" } })).toMatchObject({ code: "rejected", retry: false, detail: "Invalid parameter" });
  });
});

describe("Facebook-Seite veröffentlichen", () => {
  const creds = { pageId: "123", pageName: "Seite", accessToken: "tok" };
  const calls: { url: URL; form: FormData | undefined }[] = [];

  beforeEach(() => {
    process.env.META_APP_SECRET = "geheim";
    calls.length = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: URL, init: RequestInit) => {
        calls.push({ url, form: init.body as FormData | undefined });
        const id = `id${calls.length}`;
        return new Response(JSON.stringify(url.pathname.endsWith("/photos") ? { id, post_id: `123_${id}` } : { id: `123_${id}` }), { status: 200 });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const image = (n: number) => ({ data: Buffer.from([n]), mimeType: "image/jpeg", fileName: `b${n}.jpg` });

  it("nur Text → Seiten-Feed, mit appsecret_proof", async () => {
    const res = await new FacebookPageProvider().publish(creds, { text: "Hallo", images: [], hasVideo: false });
    expect(calls[0]!.url.pathname).toMatch(/\/123\/feed$/);
    expect(calls[0]!.form!.get("message")).toBe("Hallo");
    expect(calls[0]!.url.searchParams.get("appsecret_proof")).toMatch(/^[0-9a-f]{64}$/);
    expect(res).toEqual({ externalId: "123_id1", url: "https://www.facebook.com/123_id1" });
  });

  it("mehrere Bilder → einzeln hochladen, dann ein gemeinsamer Beitrag", async () => {
    await new FacebookPageProvider().publish(creds, { text: "Zwei Bilder", images: [image(1), image(2)], hasVideo: false });
    expect(calls.map((c) => c.url.pathname.split("/").pop())).toEqual(["photos", "photos", "feed"]);
    expect(calls[0]!.form!.get("published")).toBe("false");
    expect(calls[2]!.form!.get("attached_media[1]")).toBe(JSON.stringify({ media_fbid: "id2" }));
  });

  it("Video und leere Beiträge werden ohne Aufruf abgelehnt", async () => {
    const p = new FacebookPageProvider();
    await expect(p.publish(creds, { text: "x", images: [], hasVideo: true })).rejects.toMatchObject({ code: "videoUnsupported" });
    await expect(p.publish(creds, { text: " ", images: [], hasVideo: false })).rejects.toBeInstanceOf(PublishError);
    expect(calls).toHaveLength(0);
  });
});
