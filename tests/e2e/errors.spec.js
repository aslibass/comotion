import { test, expect, gotoHome, askAndTriage } from "./fixtures.js";

const NET = "Couldn't reach the server";
const RENDER = "Something went wrong showing this answer";

test.describe("error handling around /api/ask", () => {
  test("401 needsCode shows an inline code field inside the ask box", async ({ page, mockAsk, errors }) => {
    errors.allowed.push(/401/);
    await mockAsk(401, { error: "Access code required", needsCode: true });
    await gotoHome(page);
    await askAndTriage(page, "knee pain");
    const row = page.locator("#askBox #codeRow");
    await expect(row).toBeVisible();
    await expect(row.locator("#code")).toBeVisible();
    // Not a page-top card: the field sits below the heading "Or Ask a Question".
    const [rowTop, askTop] = await page.evaluate(() => [
      document.querySelector("#codeRow").getBoundingClientRect().top,
      document.querySelector("#askBox").getBoundingClientRect().top,
    ]);
    expect(rowTop).toBeGreaterThan(askTop);
    await expect(page.locator("#q")).toHaveValue("knee pain");
  });

  test("503 shows the 'unavailable' message", async ({ page, mockAsk, errors }) => {
    errors.allowed.push(/503/);
    await mockAsk(503, { error: "No key", screen: { floor: "SELF_MANAGE", flags: [] } });
    await gotoHome(page);
    await askAndTriage(page, "knee pain");
    await expect(page.locator("#askErr")).toContainText("Answering questions isn't working right now");
    await expect(page.locator("#askErr")).not.toContainText(NET);
  });

  test("503 with a fired red flag still renders the emergency card", async ({ page, mockAsk, errors }) => {
    errors.allowed.push(/503/);
    await mockAsk(503, { error: "No key", screen: { floor: "GP_NOW", flags: [{ id: "f", catches: "Numb legs", why: "Needs same-day care." }] } });
    await gotoHome(page);
    await askAndTriage(page, "knee pain");
    await expect(page.locator("#rungBox.GP_NOW")).toContainText("Numb legs");
  });

  test("network failure shows the 'couldn't reach the server' message", async ({ page, mockAskAbort, errors }) => {
    errors.allowed.push(/Failed to load resource|ERR_FAILED/);
    await mockAskAbort();
    await gotoHome(page);
    await askAndTriage(page, "knee pain");
    await expect(page.locator("#askErr")).toContainText(NET);
  });

  const BAD = {
    grounded: false, redFlagOnly: false, disposition: "SELF_MANAGE", flags: [], evidence: [], domains: [],
  };
  for (const [name, body] of [
    ["a null pointer", { ...BAD, pointers: [null] }],
    ["a null evidence card", { ...BAD, grounded: true, framing: "f", evidence: [null], pointers: [] }],
  ]) {
    test(`render throws on ${name}: shows the render-error message, not the network one`, async ({ page, mockAsk, errors }) => {
      errors.allowed.push(/render failed/);
      await mockAsk(200, body);
      await gotoHome(page);
      await askAndTriage(page, "knee pain");
      await expect(page.locator("#askErr")).toContainText(RENDER);
      await expect(page.locator("#askErr")).not.toContainText(NET);
      await expect(page.locator("#out")).toHaveText("");
      await expect(page.locator("#askBox")).toBeVisible();
    });
  }
});
