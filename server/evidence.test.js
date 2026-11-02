import { test } from "node:test";
import assert from "node:assert/strict";
import { EVIDENCE, SOURCES, DOMAINS, CONDITIONS, evidenceFor } from "./evidence.js";

test("every card id is unique", () => {
  const ids = EVIDENCE.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

for (const e of EVIDENCE) {
  test(`card ${e.id} is well-formed and traceable`, () => {
    assert.ok(typeof e.title === "string" && e.title.trim(), "title");
    assert.ok(typeof e.plain === "string" && e.plain.trim(), "plain");
    assert.ok(SOURCES[e.source], `source ${e.source} is not in SOURCES`);
    assert.match(e.sourceUrl, /^https:\/\//, "sourceUrl must be https");
    assert.ok(DOMAINS[e.domain], `domain ${e.domain} is not in DOMAINS`);
    assert.ok(e.condition === "*" || CONDITIONS[e.condition], `condition ${e.condition}`);
    if ("quote" in e) assert.ok(typeof e.quote === "string" && e.quote.trim(), "quote is empty");
    // Unreviewed cards are the newest additions: they must carry a verbatim quote and a date.
    if (e.reviewed === false) {
      assert.ok(e.quote?.trim(), "unreviewed card needs a quote");
      assert.match(e.retrieved, /^\d{4}-\d{2}-\d{2}$/, "unreviewed card needs a retrieved date");
    }
    for (const s of e.seeAlso ?? []) assert.ok(SOURCES[s], `seeAlso ${s} is not in SOURCES`);
    if (e.supersedes) assert.ok(SOURCES[e.supersedes.source], "supersedes.source");
  });
}

const understanding = (cards, re) =>
  cards.filter((e) => e.domain === "understanding" && (re.test(e.title) || re.test(e.plain)));

const BROWSED = [
  ["Osteoarthritis", /osteoarthritis/i, "osteoarthritis"],
  ["Osteoporosis", /osteoporosis/i, "other"],
  ["Persistent pain", /persistent pain|chronic pain/i, "other"],
  ["Back pain", /back pain/i, "back_pain"],
];

for (const [name, re, condition] of BROWSED) {
  test(`${name} has an 'understanding' card, reachable unfiltered and via evidenceFor('${condition}')`, () => {
    assert.ok(understanding(EVIDENCE, re).length >= 1, "missing from EVIDENCE");
    assert.ok(understanding(evidenceFor(condition), re).length >= 1, `missing from evidenceFor(${condition})`);
  });
}
