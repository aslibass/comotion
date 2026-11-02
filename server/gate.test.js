// THE ACCESS CODE GATES THE MODEL, NEVER SAFETY.
//
// Regression test for a live bug: /api/ask checked the access code before it ran the
// deterministic screens, so a patient who had not entered the code and answered "Yes" to
// "hot swollen joint + fever" got a 401 instead of "get seen tonight". These tests start the
// real server with a code switched on and check every path a person can take WITHOUT it.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TRIAGE, triageScreen } from "./redflags.js";

const PORT = 5079;
const BASE = `http://localhost:${PORT}`;
const CODE = "test-code-not-real";
let child;

before(async () => {
  const env = { ...process.env, PORT: String(PORT), ACCESS_CODE: CODE };
  delete env.ANTHROPIC_API_KEY; // no model anywhere in these tests
  child = spawn(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "index.js")], { env, stdio: "ignore" });
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/api/config`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("server did not start");
});
after(() => child?.kill());

const ask = (triage, headers = {}, question = "Can I still have a beer?") =>
  fetch(`${BASE}/api/ask`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ question, triage }),
  });

const answers = (v) => Object.fromEntries(TRIAGE.map((q) => [q.id, v]));

test("every triage question that raises the floor is answered WITHOUT a code, and never by the model", async () => {
  for (const q of TRIAGE) {
    for (const v of ["yes", "unsure"]) {
      const triage = { ...answers("no"), [q.id]: v };
      const expected = triageScreen(triage).floor;
      assert.notEqual(expected, "SELF_MANAGE", `${q.id}=${v} should raise the floor`);
      const res = await ask(triage); // no code header at all
      assert.equal(res.status, 200, `${q.id}=${v} must not be gated by the code`);
      const d = await res.json();
      assert.equal(d.disposition, expected);
      assert.equal(d.redFlagOnly, true);
      assert.equal(d.grounded, false);
      assert.ok(d.rung?.label, "carries the rung wording");
      assert.ok(d.flags?.length, "says which flag fired");
      assert.equal("framingTranslated" in d, false, "no model, no translation");
    }
  }
});

test("a WRONG code does not hide a raised floor either", async () => {
  const res = await ask({ ...answers("no"), [TRIAGE[0].id]: "yes" }, { "x-access-code": "wrong" });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).redFlagOnly, true);
});

test("typed red flags are answered without a code too (the keyword screen)", async () => {
  const res = await ask(answers("no"), {}, "my toe is hot and swollen and I have a fever and feel shivery");
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.notEqual(d.disposition, "SELF_MANAGE");
  assert.equal(d.redFlagOnly, true);
});

test("an ordinary question with no code is still refused (the gate still protects the key)", async () => {
  const res = await ask(answers("no"));
  assert.equal(res.status, 401);
  const d = await res.json();
  assert.equal(d.needsCode, true);
  assert.equal("redFlagOnly" in d, false);
});

test("an ordinary question with a wrong code is refused", async () => {
  assert.equal((await ask(answers("no"), { "x-access-code": "nope" })).status, 401);
});

test("an ordinary question with the right code passes the gate (503 here only because no API key)", async () => {
  const res = await ask(answers("no"), { "x-access-code": CODE });
  assert.equal(res.status, 503);
});

test("/favicon.ico redirects to the svg", async () => {
  const res = await fetch(`${BASE}/favicon.ico`, { redirect: "manual" });
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "/favicon.svg");
});
