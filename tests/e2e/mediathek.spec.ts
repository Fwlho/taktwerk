import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY ?? "", { auth: { persistSession: false } });
const run = Date.now().toString(36);
const password = "Testpasswort-123";

// 1×1-PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function setupOrg(email: string, slug: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Mia Medien" } });
  if (error) throw error;
  const { data: org } = await admin.from("organizations").insert({ name: slug, slug }).select("id").single();
  await admin.from("memberships").insert({ organization_id: org!.id, user_id: data.user.id, role: "owner" });
  await admin.from("organization_profiles").insert({ organization_id: org!.id, onboarding_completed_at: new Date().toISOString() });
  return org!.id as string;
}

test("Datei hochladen, beschreiben und vor Fremden schützen", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "einmal reicht");
  const email = `medien-${run}@test.de`;
  const slug = `medien-${run}`;
  const orgId = await setupOrg(email, slug);

  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));

  await page.goto(`/o/${slug}/assets`);
  await expect(page.getByRole("heading", { name: "Noch keine Dateien" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "Baustelle Lindenstraße.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("1 Datei hochgeladen")).toBeVisible();
  await page.getByRole("button", { name: /Baustelle Lindenstraße\.png/ }).click();
  await page.getByLabel("Bildbeschreibung").fill("Frisch gestrichene Fassade");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByLabel("Bildbeschreibung")).toBeHidden();
  await expect
    .poll(async () => (await admin.from("assets").select("alt_text").eq("organization_id", orgId).single()).data?.alt_text)
    .toBe("Frisch gestrichene Fassade");

  // Falscher Dateityp wird abgelehnt
  await page.locator('input[type="file"]').setInputFiles({ name: "notiz.txt", mimeType: "text/plain", buffer: Buffer.from("hallo") });
  await expect(page.getByText(/Dateityp nicht unterstützt/)).toBeVisible();

  const { data: asset } = await admin.from("assets").select("storage_path, alt_text").eq("organization_id", orgId).single();
  expect(asset?.alt_text).toBe("Frisch gestrichene Fassade");
  expect(asset?.storage_path.startsWith(`${orgId}/`)).toBe(true);
  expect(asset?.storage_path).not.toContain("ß");

  // Fremdes Unternehmen: kein Zugriff auf die Datei
  const stranger = `fremd-medien-${run}@test.de`;
  await setupOrg(stranger, `fremd-${run}`);
  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email: stranger, password });
  const { data: signed } = await client.storage.from("assets").createSignedUrl(asset!.storage_path, 60);
  expect(signed?.signedUrl ?? null).toBeNull();
  const { data: rows } = await client.from("assets").select("id").eq("organization_id", orgId);
  expect(rows ?? []).toHaveLength(0);
  const { error: upErr } = await client.storage.from("assets").upload(`${orgId}/x/fremd.png`, PNG, { contentType: "image/png" });
  expect(upErr).not.toBeNull();
});
