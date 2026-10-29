import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Ablauf: Ersteller legt Beitrag an und reicht ein → Inhaber gibt auf dem Smartphone mit einem Tipp frei.
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const run = Date.now().toString(36);
const password = "Testpasswort-123";

async function login(page: import("@playwright/test").Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

test.describe.configure({ mode: "serial" });

test("Beitrag einreichen und mobil freigeben", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Ablauf läuft einmal; Freigabe selbst wird mobil geprüft");
  const owner = `inhaber-fg-${run}@test.de`;
  const editor = `ersteller-fg-${run}@test.de`;
  const ids: Record<string, string> = {};
  for (const [email, name] of [
    [owner, "Olga Inhaberin"],
    [editor, "Ede Ersteller"],
  ] as const) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (error) throw error;
    ids[email] = data.user.id;
  }
  const slug = `fg-${run}`;
  const { data: org, error: orgErr } = await admin.from("organizations").insert({ name: `Freigabe ${run}`, slug }).select("id").single();
  if (orgErr) throw orgErr;
  await admin.from("memberships").insert([
    { organization_id: org.id, user_id: ids[owner]!, role: "owner" },
    { organization_id: org.id, user_id: ids[editor]!, role: "editor" },
  ]);
  await admin.from("organization_profiles").insert({ organization_id: org.id, onboarding_completed_at: new Date().toISOString() });
  await admin.from("channels").insert({ organization_id: org.id, type: "instagram", name: "Instagram" });

  // Ersteller
  await login(page, editor);
  await page.goto(`/o/${slug}/posts`);
  await page.getByRole("button", { name: "Neuer Beitrag" }).first().click();
  await page.getByLabel("Interner Titel").fill("Vorher/Nachher");
  await page.getByRole("button", { name: "Beitrag anlegen" }).click();
  await expect(page).toHaveURL(/\/posts\/[0-9a-f-]{36}$/);
  await page.getByLabel("Text", { exact: true }).fill("Fassade fertig – Termine im Mai frei.");
  await expect(page.getByText("Gespeichert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Freigeben" })).toHaveCount(0);
  await page.getByRole("button", { name: "Zur Freigabe senden" }).click();
  await expect(page.getByText("Zur Freigabe").first()).toBeVisible();

  // Inhaber auf dem Smartphone
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "de-DE" });
  const p2 = await phone.newPage();
  await login(p2, owner);
  await p2.goto(`/o/${slug}/approvals/review`);
  await expect(p2.getByText("1 von 1")).toBeVisible();
  await p2.getByRole("button", { name: "Freigeben" }).click();
  await expect(p2.getByRole("heading", { name: "Alles freigegeben" })).toBeVisible();
  await expect(p2.getByText("„Vorher/Nachher“ freigegeben")).toBeVisible();

  const { data: post } = await admin.from("posts").select("status").eq("organization_id", org.id).single();
  expect(post?.status).toBe("approved");
  await phone.close();
});
