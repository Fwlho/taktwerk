import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Plattform im Testbetrieb (PUBLISH_FAKE=1): Facebook verbinden, sofort und geplant veröffentlichen, Fehler, trennen.
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const run = Date.now().toString(36);
const password = "Testpasswort-123";

test("Facebook verbinden und veröffentlichen", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "einmal reicht");
  const email = `inhaber-fb-${run}@test.de`;
  const { data: user, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Fiona Facebook" } });
  if (error) throw error;
  const slug = `fb-${run}`;
  const { data: org } = await admin.from("organizations").insert({ name: `FB ${run}`, slug }).select("id").single();
  await admin.from("memberships").insert({ organization_id: org!.id, user_id: user.user.id, role: "owner" });
  await admin.from("organization_profiles").insert({ organization_id: org!.id, onboarding_completed_at: new Date().toISOString() });
  const { data: fb } = await admin.from("channels").insert({ organization_id: org!.id, type: "facebook", name: "Facebook" }).select("id").single();

  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));

  // Verbinden: Anmeldung (simuliert) → Seite wählen
  await page.goto(`/o/${slug}/channels`);
  await page.getByRole("link", { name: "Kanal verbinden" }).click();
  await expect(page.getByRole("heading", { name: "Facebook-Seite verbinden" })).toBeVisible();
  await page.getByText("Testseite Malerei").click();
  await page.getByRole("button", { name: "Seite verbinden" }).click();
  await expect(page.getByText("Testseite Malerei ist verbunden")).toBeVisible();
  await expect(page.getByText("Testseite Malerei", { exact: true })).toBeVisible();
  const { data: creds } = await admin.from("channel_credentials").select("ciphertext").eq("channel_id", fb!.id).single();
  expect(Buffer.from(creds!.ciphertext.slice(2), "hex").toString()).not.toContain("fake-token");

  // Sofort veröffentlichen
  const { data: post, error: pErr } = await admin
    .from("posts")
    .insert({ organization_id: org!.id, channel_id: fb!.id, title: "Herbstangebot", body: "Hallo Facebook!", status: "approved", created_by: user.user.id })
    .select("id")
    .single();
  if (pErr) throw pErr;
  await page.goto(`/o/${slug}/posts/${post!.id}`);
  await page.getByRole("button", { name: "Jetzt veröffentlichen" }).click();
  await page.getByRole("button", { name: "Veröffentlichen", exact: true }).click();
  await expect(page.getByText("Auf Facebook veröffentlicht")).toBeVisible();
  await expect(page.getByRole("link", { name: "Auf Facebook ansehen" })).toBeVisible();
  const { data: published } = await admin.from("posts").select("status, external_url").eq("id", post!.id).single();
  expect(published).toMatchObject({ status: "published", external_url: expect.stringContaining("https://example.com/fake/") });

  // Geplant: ein fälliger Beitrag wird veröffentlicht, einer wird von der Plattform abgelehnt
  const past = new Date(Date.now() - 60_000).toISOString();
  const { data: due } = await admin
    .from("posts")
    .insert([
      { organization_id: org!.id, channel_id: fb!.id, title: "Geplant ok", body: "Geplanter Text", status: "scheduled", scheduled_at: past, created_by: user.user.id },
      { organization_id: org!.id, channel_id: fb!.id, title: "Geplant Fehler", body: "Text #fehler", status: "scheduled", scheduled_at: past, created_by: user.user.id },
    ])
    .select("id, title");
  const cron = await request.post("/api/cron/publish", { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(cron.ok()).toBe(true);
  // Der Hintergrund-Takt kann parallel laufen – auf das Ergebnis warten
  await expect
    .poll(async () => {
      const { data } = await admin.from("posts").select("title, status, publish_error").in("id", due!.map((d) => d.id)).order("title");
      return data;
    })
    .toEqual([
      { title: "Geplant Fehler", status: "scheduled", publish_error: "rejected: Test: Beitrag abgelehnt" },
      { title: "Geplant ok", status: "published", publish_error: null },
    ]);
  const failed = due!.find((d) => d.title === "Geplant Fehler")!;
  await page.goto(`/o/${slug}/posts/${failed.id}`);
  await expect(page.getByText("Die Plattform hat den Beitrag abgelehnt.")).toBeVisible();

  // Unbefugt: Zeitplan-Aufruf ohne Geheimnis
  expect((await request.post("/api/cron/publish")).status()).toBe(401);

  // Trennen
  await page.goto(`/o/${slug}/channels`);
  await page.getByRole("button", { name: "Trennen" }).click();
  await page.getByRole("button", { name: "Trennen" }).last().click();
  await expect(page.getByText("Facebook getrennt")).toBeVisible();
  const { count } = await admin.from("channel_credentials").select("channel_id", { count: "exact", head: true }).eq("channel_id", fb!.id);
  expect(count).toBe(0);
});
