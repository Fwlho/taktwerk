import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ohne .env.local laufen nur Tests, die keine DB brauchen
}

// Voraussetzung: lokale Supabase läuft (npm run db:start) und .env.local zeigt darauf.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: 0,
  // Dev-Server kompiliert Seiten beim ersten Aufruf – großzügige Wartezeiten
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: "http://localhost:3000",
    locale: "de-DE",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
