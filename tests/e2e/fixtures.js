import { test as base, expect } from "@playwright/test";

/**
 * Every test gets:
 *  - external font hosts blocked (tests must not depend on Google Fonts),
 *  - a collector for page errors and console errors, asserted empty at the end
 *    (a test that deliberately provokes a console error calls `allowConsoleError(/re/)`),
 *  - `askCalls`: the list of POST /api/ask request bodies the page made,
 *  - `mockAsk(status, body)` / `mockAskAbort()` to stand in for the model.
 * /api/ask is NEVER allowed to reach the real server.
 */
export const test = base.extend({
  errors: async ({}, use) => use({ page: [], console: [], allowed: [] }),
  askCalls: async ({}, use) => use([]),

  page: async ({ page, errors, askCalls }, use) => {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
    page.on("pageerror", (e) => errors.page.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.console.push(m.text()); });
    // Default: /api/ask is unmocked => fail loudly rather than hit the server/model.
    await page.route("**/api/ask", async (route) => {
      askCalls.push(route.request().postDataJSON());
      await route.fulfill({ status: 599, contentType: "application/json", body: JSON.stringify({ error: "unmocked /api/ask" }) });
    });
    await use(page);
    const bad = errors.console.filter((t) => !errors.allowed.some((re) => re.test(t)));
    expect(errors.page, "uncaught page errors").toEqual([]);
    expect(bad, "console errors").toEqual([]);
  },

  mockAsk: async ({ page, askCalls }, use) => {
    await use(async (status, body) => {
      await page.unroute("**/api/ask");
      await page.route("**/api/ask", async (route) => {
        askCalls.push(route.request().postDataJSON());
        await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      });
    });
  },
  mockAskAbort: async ({ page, askCalls }, use) => {
    await use(async () => {
      await page.unroute("**/api/ask");
      await page.route("**/api/ask", (route) => { askCalls.push(route.request().postDataJSON()); route.abort("failed"); });
    });
  },
});

export { expect };

export const EN_EXAMPLES = [
  "What is osteoarthritis?",
  "How can I manage pain?",
  "Where can I find support near me?",
  "Can I get information in Vietnamese?",
];

/** Open the app and wait until the topic cards have rendered. */
export async function gotoHome(page) {
  await page.goto("/app");
  await expect(page.locator("#topics .topic")).toHaveCount(3);
}

/** Ask a question and answer every triage question. */
export async function askAndTriage(page, question, answer = "no") {
  await page.locator("#q").fill(question);
  await page.locator("#ask").click();
  await expect(page.locator("#triBox")).toBeVisible();
  const groups = page.locator("#tqs .opts");
  const n = await groups.count();
  for (let i = 0; i < n; i++) await groups.nth(i).locator(`.opt[data-v="${answer}"]`).click();
  await page.locator("#triGo").click();
}
