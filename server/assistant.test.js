import { test } from "node:test";
import assert from "node:assert/strict";
import { SYSTEM, ANSWER_SCHEMA } from "./assistant.js";

const BANNED = ["card", "cards", "library", "explain-tier", "navigate-tier", "tier", "directory", "sourced", "allowlist", "evidence", "rule engine", "model"];
const props = ANSWER_SCHEMA.properties;
const reason = props.unansweredReason.anyOf[0].description;

test("SYSTEM forbids internal terms in patient-visible fields", () => {
  assert.match(SYSTEM, /WORDS THE PATIENT MUST NEVER SEE/);
  const line = SYSTEM.split("\n").find((l) => l.startsWith("WORDS THE PATIENT MUST NEVER SEE"));
  for (const w of BANNED) assert.ok(line.includes(w), `prohibition lists "${w}"`);
  assert.match(line, /never use the words/i);
});

test("patient-visible field descriptions carry the prohibition and no 'say' instruction", () => {
  for (const [name, d] of [["framing", props.framing.description], ["gpQuestion", props.gpQuestion.description], ["unansweredReason", reason]]) {
    assert.match(d, /never use the words/i, name);
    for (const w of BANNED) assert.ok(d.includes(w), `${name} lists ${w}`);
    assert.doesNotMatch(d, /\b(say|tell them|write)\b[^.]*\b(the (cards?|library)|explain-tier)\b/i, name);
  }
  assert.match(reason, /exactly ONE plain sentence/);
});

test("worked examples shown to the model do not contain banned words", () => {
  const ex = [...SYSTEM.matchAll(/for example "([^"]+)"/g)].map((m) => m[1]).concat(reason.match(/e\.g\. '([^']+)'/)?.[1] ?? "");
  assert.ok(ex.length >= 2);
  for (const e of ex) for (const w of BANNED) assert.doesNotMatch(e.toLowerCase(), new RegExp(`\b${w}\b`), e);
});

test("SYSTEM covers no-location and language-question rules", () => {
  assert.match(SYSTEM, /NO LOCATION/);
  assert.match(SYSTEM, /Australia-wide/);
  assert.match(SYSTEM, /Never invent a service or a phone number/);
  assert.match(SYSTEM, /domains to \["language"\]/);
});
