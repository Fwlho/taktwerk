import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Testkonten werden direkt über die lokale Supabase angelegt (bestätigt), damit kein Mail-Postfach nötig ist.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";
const admin = createClient(url, secret, { auth: { persistSession: false } });

const run = Date.now().toString(36);
const password = "Testpasswort-123";

async function createUser(email: string, fullName: string) {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
}

test.describe.configure({ mode: "serial" });

test("Registrierung zeigt Hinweis auf Bestätigungs-Mail", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Dein Name").fill("Neu Person");
  await page.getByLabel("E-Mail").fill(`neu-${run}@test.de`);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Konto anlegen" }).click();
  await expect(page.getByRole("heading", { name: "Fast geschafft" })).toBeVisible();
});

test("Feldfehler erscheinen erst beim Verlassen des Feldes", async ({ page }) => {
  await page.goto("/login");
  const email = page.getByLabel("E-Mail");
  await email.fill("kaputt");
  await expect(page.getByText(/vollständige E-Mail/)).toHaveCount(0);
  await email.blur();
  await expect(page.getByText(/vollständige E-Mail/)).toBeVisible();
});

test("Anmelden → Unternehmen anlegen → Onboarding → Mitglied einladen", async ({ page }, testInfo) => {
  const ownerEmail = `inhaber-${run}-${testInfo.project.name}@test.de`;
  await createUser(ownerEmail, "Anna Inhaberin");

  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(ownerEmail);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();

  await expect(page).toHaveURL(/\/organizations\/new/);
  await page.getByLabel("Name des Betriebs").fill(`Malerei Krause ${run}`);
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Branche").selectOption("craft");
  await page.getByText("Privatkunden").click();
  await page.getByText("Per Sie, sachlich").click();
  await page.getByRole("button", { name: "Fertig" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Anna");
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" }).first()).toBeVisible();

  const slug = new URL(page.url()).pathname.split("/")[2];
  await page.goto(`/o/${slug}/settings/team`);
  await page.getByRole("button", { name: "Person einladen" }).click();
  await page.getByLabel("E-Mail").fill(`kollege-${run}-${testInfo.project.name}@test.de`);
  await page.getByLabel("Rolle").selectOption("editor");
  await page.getByRole("button", { name: "Einladung senden" }).click();
  await expect(page.getByRole("heading", { name: "Einladung erstellt" })).toBeVisible();
  await expect(page.getByLabel("Einladungslink").first()).toHaveValue(/\/invite\//);
});

test("Fremdes Unternehmen ist nicht erreichbar", async ({ page }, testInfo) => {
  const a = `a-${run}-${testInfo.project.name}@test.de`;
  const b = `b-${run}-${testInfo.project.name}@test.de`;
  await createUser(a, "Anton A");
  await createUser(b, "Berta B");

  // A legt ein Unternehmen an
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(a);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByLabel("Name des Betriebs").fill(`Geheim ${run}`);
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  const slug = new URL(page.url()).pathname.split("/")[2];
  await page.context().clearCookies();

  // B darf es nicht sehen
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(b);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/organizations\/new/);
  const res = await page.goto(`/o/${slug}`);
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Seite nicht gefunden" })).toBeVisible();
});
