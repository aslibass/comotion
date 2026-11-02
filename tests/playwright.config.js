import { defineConfig } from "@playwright/test";

const PORT = 5076;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.js",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: "chromium",
    headless: true,
    viewport: { width: 390, height: 844 },
    // Without these Windows display scaling can shrink the layout viewport (the 260px quirk).
    deviceScaleFactor: 2,
    isMobile: false,
    // The page loads Google Fonts; tests must not depend on the network for them.
    // (Blocking is done per-test in fixtures.js.)
  },
  webServer: {
    command: "node server/index.js",
    cwd: "..",
    url: `http://localhost:${PORT}/api/config`,
    reuseExistingServer: false,
    timeout: 20_000,
    // ACCESS_CODE blank and no API key: the server is the local, un-gated, model-less one.
    env: { PORT: String(PORT), ACCESS_CODE: "", ANTHROPIC_API_KEY: "" },
  },
});
