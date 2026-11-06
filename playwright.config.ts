import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout (SCRUM-101), en mode mock : aucun backend nécessaire.
// Première fois : npx playwright install chromium
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "off",
    locale: "fr-FR",
    timezoneId: "Africa/Casablanca",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    env: { VITE_USE_MOCK: "true" },
  },
});
