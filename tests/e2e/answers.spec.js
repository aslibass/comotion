import { test, expect, gotoHome, askAndTriage } from "./fixtures.js";

const ptr = (over = {}) => ({
  id: "r1", title: "Pain Revolution resource", url: "https://example.org/pain",
  description: "A plain-language guide to living with persistent pain.",
  domains: ["symptoms"], tags: { topic: ["pain"] }, languages: [], ...over,
});

const GROUNDED = {
  question: "q", grounded: true, redFlagOnly: false, disposition: "SELF_MANAGE", flags: [],
  framing: "Staying gently active usually helps persistent knee pain.",
  framingTranslated: null,
  evidence: [{ id: "e1", title: "Keep moving", plain: "Movement is safe and helps.", quote: "Exercise helps",
    source: "x", sourceUrl: "https://example.org/e1" }],
  pointers: [
    ptr({ title: "Read this guide", action: "read" }),
    ptr({ id: "r2", title: "Watch this video", action: "watch", url: "https://example.org/v" }),
    ptr({ id: "r3", title: "Join the program", action: "contact", url: "https://example.org/c", domains: ["services"] }),
  ],
  domains: ["understanding", "symptoms", "services", "wellbeing"],
  gpQuestion: "Can I get a referral to a physiotherapist?", parked: false,
};

const headings = (page) => page.locator("#out h2.ansH").allTextContents();

test.describe("normal question flow (/api/ask mocked)", () => {
  test("question -> triage questions -> answers sent to the server", async ({ page, mockAsk, askCalls }) => {
    await mockAsk(200, GROUNDED);
    await gotoHome(page);
    await askAndTriage(page, "My knee pain is getting worse");
    await expect(page.locator("#out")).toContainText("What we found");
    expect(askCalls).toHaveLength(1);
    expect(askCalls[0].question).toBe("My knee pain is getting worse");
    expect(Object.values(askCalls[0].triage)).toEqual(["no", "no", "no", "no"]);
  });

  test("triage cannot be submitted until all four are answered", async ({ page }) => {
    await gotoHome(page);
    await page.locator("#q").fill("knee pain");
    await page.locator("#ask").click();
    await expect(page.locator("#triGo")).toBeDisabled();
    await page.locator("#tqs .opts").first().locator('.opt[data-v="no"]').click();
    await expect(page.locator("#triGo")).toBeDisabled();
  });

  test("grounded answer with pointers: sections in order, chips, badges, next steps", async ({ page, mockAsk }) => {
    await mockAsk(200, GROUNDED);
    await gotoHome(page);
    await askAndTriage(page, "My knee pain is getting worse");
    await expect(page.locator("#out")).toContainText("Your next steps");
    expect(await headings(page)).toEqual([
      "What we found", "Related topics", "Trusted resources highlighting what you can do next", "Your next steps",
    ]);
    // Related topics: at most 3, spec labels for understanding/symptoms/services.
    expect(await page.locator("#relTopics .eg").allTextContents()).toEqual([
      "Condition Information", "Pain Management", "Service Navigation",
    ]);
    // Resource cards render with Read / Watch / Contact/join badges.
    const cards = page.locator("#out .dir");
    await expect(cards).toHaveCount(3);
    expect(await cards.locator(".badge.act").allTextContents()).toEqual(["Read", "Watch", "Contact/join"]);
    await expect(cards.first().locator("a.go")).toHaveAttribute("href", "https://example.org/pain");
    // Your next steps carries the GP question and is saved to the log.
    await expect(page.locator("#gpq")).toHaveText("Can I get a referral to a physiotherapist?");
    await expect(page.locator("#out .rung")).toHaveCount(1); // SELF_MANAGE grounded keeps its banner
  });

  test("regression: resource links whose tags is an object, a number, or absent do not crash", async ({ page, mockAsk }) => {
    await mockAsk(200, { ...GROUNDED, pointers: [ptr({ tags: { a: ["b"] } }), ptr({ id: "r2", tags: 5 }), ptr({ id: "r3", tags: undefined })] });
    await gotoHome(page);
    await askAndTriage(page, "knee pain");
    await expect(page.locator("#out .dir")).toHaveCount(3);
    await expect(page.locator("#askErr")).toBeHidden();
  });

  test("related topic chip opens that topic", async ({ page, mockAsk }) => {
    await mockAsk(200, GROUNDED);
    await gotoHome(page);
    await askAndTriage(page, "knee pain");
    await page.locator("#relTopics .eg", { hasText: "Pain Management" }).click();
    await expect(page.locator("#dirTitle")).toHaveText("Managing symptoms");
  });

  for (const [code, dir, resLang] of [["vi", "ltr", "Vietnamese"], ["ar", "rtl", "Arabic"]]) {
    test(`grounded + framingTranslated (${code}): translated paragraph first, MT label, English behind a details`, async ({ page, mockAsk, askCalls }) => {
      await mockAsk(200, { ...GROUNDED, framingTranslated: { text: `TRANSLATED-${code}` } });
      await gotoHome(page);
      await page.locator(`.uil[data-c="${code}"]`).click();
      await expect(page.locator("html")).toHaveAttribute("lang", code);
      await askAndTriage(page, "My knee pain is getting worse");
      const first = page.locator("#out p.answer").first();
      await expect(first).toHaveText(`TRANSLATED-${code}`);
      await expect(first).toHaveAttribute("lang", code);
      await expect(first).toHaveAttribute("dir", dir);
      expect(askCalls[0].language).toBe(resLang);
      // The next sibling is the machine-translation label; then the English original is collapsed.
      const mt = page.locator("#out p.mt").first();
      await expect(mt).toBeVisible();
      await expect(mt).toHaveAttribute("dir", dir);
      expect((await mt.textContent()).length).toBeGreaterThan(20);
      const det = page.locator("#out details.mt");
      expect(await det.evaluate((d) => d.open)).toBe(false);
      await det.locator("summary").click();
      const en = det.locator("p.answer");
      await expect(en).toHaveText(GROUNDED.framing);
      await expect(en).toHaveAttribute("lang", "en");
      await expect(en).toHaveAttribute("dir", "ltr");
    });
  }

  test("non-grounded SELF_MANAGE info-only: no rung banner, shows where to look", async ({ page, mockAsk }) => {
    await mockAsk(200, {
      question: "q", grounded: false, redFlagOnly: false, disposition: "SELF_MANAGE", flags: [],
      evidence: [], pointers: [ptr({ action: "contact", domains: ["services"] })], domains: ["services"],
      unansweredReason: "Our sources do not cover local clinics.", gpQuestion: null, parked: true,
    });
    await gotoHome(page);
    await askAndTriage(page, "Where can I find support near me?");
    await expect(page.locator("#out")).toContainText("We don't have a checked answer for that one.");
    await expect(page.locator("#out")).toContainText("here's where to look");
    await expect(page.locator("#out .rung")).toHaveCount(0);
    await expect(page.locator("#rungBox")).toHaveCount(0);
    await expect(page.locator("#out .dir")).toHaveCount(1);
  });

  test("GP_NOW with flags: rung banner with its verb, flag reasons", async ({ page, mockAsk }) => {
    const cfg = await (await page.request.get("/api/config")).json();
    const gpNow = cfg.rungs.GP_NOW;
    await mockAsk(200, {
      ...GROUNDED, disposition: "GP_NOW", framing: "See a doctor today.", raisedByRule: true, modelSaid: "Self-manage",
      flags: [{ id: "f1", catches: "Hot swollen joint", why: "Could be an infection." }],
    });
    await gotoHome(page);
    await askAndTriage(page, "my knee is hot and swollen");
    const banner = page.locator("#rungBox.GP_NOW");
    await expect(banner).toBeVisible();
    await expect(banner.locator(".verb")).toHaveText(gpNow.label);
    await expect(banner.locator(".verb")).toBeVisible();
    await expect(banner).toContainText("Hot swollen joint");
    await expect(banner.locator(".raised")).toBeVisible();
    // Urgent answers suppress navigation: no related topics, no resource list.
    await expect(page.locator("#relTopics")).toHaveCount(0);
    await expect(page.locator("#out .dir")).toHaveCount(0);
  });

  test("ED red-flag-only: emergency card, call link, no 'What we found'", async ({ page, mockAsk }) => {
    const cfg = await (await page.request.get("/api/config")).json();
    await mockAsk(200, {
      question: "q", grounded: false, redFlagOnly: true, disposition: "ED", rung: cfg.rungs.ED,
      flags: [{ id: "f2", catches: "Fever with a hot joint", why: "This can be a joint infection." }],
      evidence: [], gpQuestion: "[Flare on today] hot joint", parked: true,
    });
    await gotoHome(page);
    await askAndTriage(page, "hot joint and feverish");
    const banner = page.locator("#rungBox.ED");
    await expect(banner).toBeVisible();
    await expect(banner.locator(".verb")).toHaveText(cfg.rungs.ED.label);
    await expect(banner.locator("a.call")).toHaveAttribute("href", /^tel:/);
    await expect(banner).toContainText("Fever with a hot joint");
    expect(await headings(page)).not.toContain("What we found");
    await expect(page.locator("#out")).not.toContainText("We don't have a checked answer");
  });
});
