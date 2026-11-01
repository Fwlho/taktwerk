import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// KI-Assistent im Testbetrieb (AI_FAKE=1): erstes Ziel → Kampagne, Text schreiben + übernehmen, Prompt ausführen, Ideen.
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
});
const run = Date.now().toString(36);
const password = "Testpasswort-123";

test("KI-Assistent: Kampagne, Text, Prompt und Ideen", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "einmal reicht");
  const email = `inhaber-ki-${run}@test.de`;
  const { data: user, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Karin KI" } });
  if (error) throw error;
  const slug = `ki-${run}`;
  const { data: org } = await admin.from("organizations").insert({ name: `KI ${run}`, slug }).select("id").single();
  await admin.from("memberships").insert({ organization_id: org!.id, user_id: user.user.id, role: "owner" });
  await admin.from("organization_profiles").insert({ organization_id: org!.id, industry: "craft", onboarding_completed_at: new Date().toISOString() });
  const { data: ig } = await admin.from("channels").insert({ organization_id: org!.id, type: "instagram", name: "Instagram" }).select("id").single();

  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));

  // Onboarding Schritt 3: erstes Ziel → Kampagne mit 4 Ideen
  await page.goto(`/o/${slug}/onboarding?step=goal`);
  await page.getByText("Mehr Anfragen", { exact: true }).click();
  await page.getByRole("button", { name: "Kampagne anlegen" }).click();
  await expect(page.getByText("Erste Kampagne mit 4 Beitragsideen angelegt")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/o/${slug}$`));
  const { count: ideaCount } = await admin.from("posts").select("id", { count: "exact", head: true }).eq("organization_id", org!.id).eq("status", "idea");
  expect(ideaCount).toBe(4);

  // Beitragseditor: Text schreiben lassen, übernehmen, rückgängig
  // (Beiträge entstehen nur über die App – eine der Kampagnen-Ideen auf Instagram verwenden)
  const { data: post } = await admin
    .from("posts")
    .select("id")
    .eq("organization_id", org!.id)
    .eq("channel_id", ig!.id)
    .limit(1)
    .single();
  await page.goto(`/o/${slug}/posts/${post!.id}`);
  const textArea = page.getByLabel("Text", { exact: true });
  await textArea.fill("");
  await page.getByLabel("Wunsch an den Assistenten").fill("Termine im Mai frei");
  await page.getByRole("button", { name: "Text schreiben" }).click();
  await expect(page.getByText("Testvorschlag (write)")).toBeVisible();
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(textArea).toHaveValue(/Testvorschlag \(write\)/);
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(textArea).toHaveValue("");

  // Schnellbefehl auf vorhandenen Text
  await textArea.fill("Unser Team hat die Fassade in der Lindenstraße fertig gestrichen.");
  await page.getByRole("button", { name: "Kürzer" }).click();
  await expect(page.getByText("Testvorschlag (shorter)")).toBeVisible();
  await page.getByRole("button", { name: "Verwerfen" }).click();
  await expect(textArea).toHaveValue(/Lindenstraße/);

  // Prompt anlegen und ausführen
  await page.getByRole("button", { name: "Prompt hinzufügen" }).click();
  await page.getByLabel("Art").selectOption("caption");
  await page.getByLabel("Prompt", { exact: true }).fill("Kurze Bildunterschrift");
  await page.getByRole("button", { name: "Ausführen" }).click();
  await expect(page.getByText("Testvorschlag (caption)")).toBeVisible();

  // Ideen auf der Übersicht
  await page.goto(`/o/${slug}`);
  await page.getByRole("button", { name: "Ideen vorschlagen" }).click();
  await expect(page.getByRole("button", { name: "Testidee 1" })).toBeVisible();
  await page.getByRole("button", { name: "Alle als Ideen anlegen" }).click();
  await expect(page.getByText("5 Ideen angelegt")).toBeVisible();

  // Nutzungsprotokoll: nur Mengen, Tageslimit gezählt
  const { data: log } = await admin.from("ai_requests").select("*").eq("organization_id", org!.id);
  expect(log!.length).toBeGreaterThanOrEqual(5);
  expect(Object.keys(log![0]!).sort()).toEqual(["created_at", "finished_at", "id", "input_tokens", "kind", "model", "organization_id", "output_tokens", "user_id"]);
});
