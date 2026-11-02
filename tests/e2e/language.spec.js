import { test, expect, gotoHome } from "./fixtures.js";

async function ask(page, q) {
  await page.locator("#q").fill(q);
  await page.locator("#ask").click();
}

test("pure language question shows the language card: no model call, no triage", async ({ page, askCalls }) => {
  await gotoHome(page);
  await ask(page, "Can I get information in Vietnamese?");
  await expect(page.locator("#langCard")).toBeVisible();
  await expect(page.locator("#triBox")).toBeHidden();
  expect(askCalls).toHaveLength(0);
});

// A language ask that ALSO describes symptoms must still go through the safety questions.
// Safety: the language shortcut must never swallow symptoms (it once did; the page now sends
// these through the red-flag questions). Kept as a guard.
for (const q of [
  "I have chest pain, can I get information in Vietnamese?",
  "my hot swollen joint and I feel feverish — information in Arabic please",
  "Vietnamese information — I cannot feel my legs and I have lost control of my bladder",
  "Can I get information in Vietnamese? Also I have a rash on a new medicine",
  // Symptoms typed in another script must NEVER take the shortcut (found by the safety review):
  "ألم في الصدر وضيق تنفس - help in Arabic?",
  "أشعر بألم في الصدر information in Arabic",
  "我胸口痛，不能呼吸 information in Chinese",
  "ܟܐܒܐ ܒܚܕܝܐ information in Assyrian",
  "Хочу information in Arabic",
  "information in Arabic 🫀🩸",
]) {
  test(`mixed symptoms + language ask must go to triage: "${q}"`, async ({ page }) => {
    await gotoHome(page);
    await ask(page, q);
    await expect(page.locator("#triBox")).toBeVisible({ timeout: 2000 });
  });
}

test.describe("UI languages", () => {
  const SIREN = "Some things can't wait for this page.";

  test("Tieng Viet switches lang and keeps English safety strings", async ({ page }) => {
    await gotoHome(page);
    const before = await page.locator(".siren").innerText();
    await page.locator('.uil[data-c="vi"]').click();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("h2.hero")).not.toHaveText("What are you looking for today?");
    await expect(page.locator(".siren")).toContainText(SIREN);
    expect(await page.locator(".siren").innerText()).toBe(before);
  });

  test("Arabic switches to rtl and keeps English safety strings", async ({ page }) => {
    await gotoHome(page);
    const before = await page.locator(".siren").innerText();
    await page.locator('.uil[data-c="ar"]').click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("h2.hero")).not.toHaveText("What are you looking for today?");
    await expect(page.locator(".siren")).toContainText(SIREN);
    expect(await page.locator(".siren").innerText()).toBe(before);
  });
});
