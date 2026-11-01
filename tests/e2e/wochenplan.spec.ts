import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Ablauf: Ersteller plant die Woche per Schnell-Anlegen, reicht sie gesammelt ein, Inhaberin gibt alles auf einmal frei.
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

test("Woche planen, gesammelt einreichen und freigeben", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "einmal reicht");
  const owner = `inhaber-wp-${run}@test.de`;
  const editor = `ersteller-wp-${run}@test.de`;
  const ids: Record<string, string> = {};
  for (const [email, name] of [
    [owner, "Olga Inhaberin"],
    [editor, "Ede Ersteller"],
  ] as const) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (error) throw error;
    ids[email] = data.user.id;
  }
  const slug = `wp-${run}`;
  const { data: org } = await admin.from("organizations").insert({ name: `Wochenplan ${run}`, slug }).select("id").single();
  await admin.from("memberships").insert([
    { organization_id: org!.id, user_id: ids[owner]!, role: "owner" },
    { organization_id: org!.id, user_id: ids[editor]!, role: "editor" },
  ]);
  await admin.from("organization_profiles").insert({ organization_id: org!.id, onboarding_completed_at: new Date().toISOString() });
  await admin.from("channels").insert({ organization_id: org!.id, type: "instagram", name: "Instagram" });

  // Ersteller: nächste Woche planen
  await login(page, editor);
  await page.goto(`/o/${slug}/week`);
  await page.getByRole("button", { name: "Nächste Woche" }).click();
  await page.waitForURL(/week\?date=/);
  const quick = page.getByLabel(/Beitrag für Instagram am Montag/);
  await quick.fill("Tipp der Woche");
  await quick.press("Enter");
  await expect(page.getByRole("link", { name: /Tipp der Woche/ })).toBeVisible();
  await page.getByRole("button", { name: "Woche zur Freigabe senden" }).click();
  await page.getByRole("button", { name: "Einreichen" }).click();
  await expect(page.getByText("Zur Freigabe gesendet")).toBeVisible();

  // Inhaberin: Sammel-Nachricht + alles freigeben
  const ctx = await browser.newContext({ locale: "de-DE" });
  const p2 = await ctx.newPage();
  await login(p2, owner);
  await p2.getByRole("button", { name: "1 neue Benachrichtigung" }).first().click();
  await p2.getByRole("button", { name: /Woche zur Freigabe eingereicht/ }).click();
  await expect(p2).toHaveURL(/\/week\?date=/);
  await p2.getByRole("button", { name: "Freigeben" }).click();
  await expect(p2.getByText("1 Beitrag freigegeben")).toBeVisible();

  const { data: posts } = await admin.from("posts").select("status").eq("organization_id", org!.id);
  expect(posts?.map((p) => p.status)).toEqual(["approved"]);
  await ctx.close();
});
