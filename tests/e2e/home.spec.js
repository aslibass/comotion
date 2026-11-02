import { test, expect, gotoHome, EN_EXAMPLES } from "./fixtures.js";

test.describe("homepage at 390x844", () => {
  test("viewport really is 390 wide (catches the Windows scaling quirk)", async ({ page }) => {
    await gotoHome(page);
    expect(await page.evaluate(() => window.innerWidth)).toBe(390);
  });

  test("first screen: heading, emergency banner and concern link need no scrolling", async ({ page }) => {
    await gotoHome(page);
    const vh = await page.evaluate(() => window.innerHeight);
    const h = page.getByRole("heading", { name: "What are you looking for today?" });
    await expect(h).toBeVisible();
    for (const loc of [h, page.locator(".siren"), page.getByText("Something feels wrong right now")]) {
      const box = await loc.boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(vh);
    }
    const fs = await h.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fs).toBeGreaterThanOrEqual(24);
  });

  test("no access-code card on the page, no horizontal scroll", async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByText("Access code", { exact: true })).toBeHidden();
    await expect(page.locator("#codeRow")).toBeHidden();
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    expect(sw).toBeLessThanOrEqual(iw);
  });

  test("section labels keep their exact casing", async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByText("Browse Topics", { exact: true })).toBeVisible();
    await expect(page.getByText("Or Ask a Question", { exact: true })).toBeVisible();
  });

  test("four example buttons with the spec texts; clicking fills the box and does not ask", async ({ page, askCalls }) => {
    await gotoHome(page);
    const egs = page.locator("#egs .eg");
    await expect(egs).toHaveCount(4);
    expect(await egs.allTextContents()).toEqual(EN_EXAMPLES);
    for (const text of EN_EXAMPLES) {
      await page.getByRole("button", { name: text, exact: true }).click();
      await expect(page.locator("#q")).toHaveValue(text);
    }
    await expect(page.locator("#triBox")).toBeHidden();
    expect(askCalls).toHaveLength(0);
  });

  test("'More help' is a closed details below the ask box; page is short", async ({ page }) => {
    await gotoHome(page);
    const more = page.locator("details#more");
    await expect(more).toBeVisible();
    expect(await more.evaluate((d) => d.open)).toBe(false);
    const [askBottom, moreTop] = await page.evaluate(() => [
      document.querySelector("#askBox").getBoundingClientRect().bottom,
      document.querySelector("#more").getBoundingClientRect().top,
    ]);
    expect(moreTop).toBeGreaterThanOrEqual(askBottom);
    await expect(more.locator("#flagsD")).toBeAttached();
    expect(await more.locator("#flags .flag").count()).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(3500);
  });

  test("siren 'See the full list' opens More help with the emergency list", async ({ page }) => {
    await gotoHome(page);
    await page.locator("#sirenList").click();
    await expect(page.locator("details#more")).toHaveJSProperty("open", true);
    await expect(page.locator("details#flagsD")).toHaveJSProperty("open", true);
    await expect(page.locator("#flags .flag").first()).toBeVisible();
  });
});

test.describe("nesting of Browse Topics", () => {
  test("exactly three top-level cards with their children", async ({ page }) => {
    await gotoHome(page);
    const cards = page.locator("#topics .topic");
    await expect(cards).toHaveCount(3);
    const tree = await cards.evaluateAll((els) => els.map((el) => ({
      parent: el.querySelector(".dom b").textContent.trim(),
      kids: [...el.querySelectorAll(".kid > span:first-child")].map((s) => s.textContent.trim()),
    })));
    expect(tree).toEqual([
      { parent: "Understanding my condition", kids: ["Managing symptoms"] },
      { parent: "Practical self-management", kids: ["Improving my health and wellbeing"] },
      { parent: "Finding services and support", kids: ["Programs and community resources", "Preparing for healthcare appointments"] },
    ]);
  });

  test("no language tile, no language chip row, no 'This is about:'", async ({ page }) => {
    await gotoHome(page);
    await expect(page.locator("#browseBox").getByText("Information in my language")).toHaveCount(0);
    await expect(page.locator(".chip")).toHaveCount(0);
    await expect(page.getByText("This is about:")).toHaveCount(0);
  });
});

test.describe("opening a topic", () => {
  test("hides the ask box, scrolls the heading into view, condition buttons filter", async ({ page }) => {
    await gotoHome(page);
    await page.locator('#topics .dom[data-k="understanding"]').click();
    await expect(page.locator("#dirBox")).toBeVisible();
    await expect(page.locator("#askBox")).toBeHidden();
    await expect(page.locator("#dirTitle")).toHaveText("Understanding my condition");
    // The heading's top must land inside the viewport (poll: scrollIntoView settles after render).
    await expect.poll(async () => {
      const b = await page.locator("#dirTitle").boundingBox();
      return !!b && b.y >= 0 && b.y < 844;
    }).toBe(true);

    const chips = page.locator("#condRow .chip");
    const labels = await chips.allTextContents();
    for (const name of ["Osteoarthritis", "Osteoporosis", "Persistent Pain", "Back Pain"]) {
      expect(labels.some((l) => l.startsWith(name) && /\(\d+\)/.test(l)), name).toBe(true);
    }

    const back = page.locator('#condRow .chip[data-cond="back-pain"]');
    const n = Number((await back.textContent()).match(/\((\d+)\)/)[1]);
    await back.click();
    await expect(page.locator('#condRow .chip[data-cond="back-pain"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#dirOut .dir")).toHaveCount(n);

    await page.locator("#dirBack").click();
    await expect(page.locator("#askBox")).toBeVisible();
    await expect(page.locator("#browseBox")).toBeVisible();
    await expect(page.locator("#dirBox")).toBeHidden();
  });
});
