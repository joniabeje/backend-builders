import { defineConfig, devices } from "@playwright/test";

// The e2e server gets its own port, and strictPort makes it fail loudly instead of moving
// to another port. Otherwise a dev server you already have on 8080 (the Lovable default)
// would push it elsewhere and Playwright would wait on the wrong URL.
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // The Vite dev server compiles on demand, and more parallel browsers than this make
  // hydration slow enough to trip assertion timeouts (seen at 4 workers on Windows).
  workers: 2,
  expect: { timeout: 10_000 },
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Smoke tests still use the in-memory seed (#57). Persistence e2e against the
    // emulator is a follow-up once auth and seeding are part of the default local loop.
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: { ...process.env, VITE_USE_MOCKS: "true" },
  },
});
