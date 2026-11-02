import { test } from "node:test";
import assert from "node:assert/strict";
import { unescapeUnicode } from "./text.js";
import { SYSTEM } from "./assistant.js";

test("unescapeUnicode turns a double-escaped em dash back into the character", () => {
  assert.equal(unescapeUnicode("car repairs \\u2014 only about pain"), "car repairs — only about pain");
  assert.equal(unescapeUnicode("It\\u2019s fine \\u00e9"), "It’s fine é");
});

test("unescapeUnicode leaves ordinary text, real dashes and other backslashes alone", () => {
  assert.equal(unescapeUnicode("plain text — already fine"), "plain text — already fine");
  assert.equal(unescapeUnicode("C:\\temp and \\n and \\u12"), "C:\\temp and \\n and \\u12");
});

test("the model is told never to diagnose from symptoms", () => {
  assert.match(SYSTEM, /NEVER DIAGNOSE/);
  assert.match(SYSTEM, /never tell the person that THEIR symptoms match/);
});
