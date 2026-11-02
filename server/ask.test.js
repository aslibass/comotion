// End-to-end test of the REAL /api/ask handler against a FAKE model server.
//
// The Anthropic SDK honours ANTHROPIC_BASE_URL, so we point the real server at a tiny local HTTP
// server that speaks just enough of the Messages API. This exercises the whole success path that
// unit tests and `node --check` cannot: text clean-up, evidence/pointer validation, translation,
// response shape — and that the emergency path never reaches the model at all.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const FAKE_PORT = 5081;
const APP_PORT = 5082;
const BASE = `http://localhost:${APP_PORT}`;
const CODE = "ask-test-code";

const directory = JSON.parse(readFileSync(join(here, "../data/directory.json"), "utf8"));
const POINTER_ID = directory.resources[0].id;

let fake, app;
let modelCalls = [];

// What the "model" answers. NOTE the literal backslash-u2014: the real model once double-escaped
// an em dash, and the patient saw "—" on screen.
const answerJson = () => ({
  answerable: true,
  evidenceIds: ["understand-oa-what", "no-such-card-the-model-invented"],
  pointerIds: [POINTER_ID, "no-such-resource"],
  domains: ["understanding"],
  framing: "Osteoarthritis is a joint condition \\u2014 it often comes on over 6 months. Ask your GP in NSW.",
  disposition: "SELF_MANAGE",
  gpQuestion: "Could this be osteoarthritis \\u2014 what should I do?",
  unansweredReason: null,
});

before(async () => {
  fake = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const j = JSON.parse(body || "{}");
      const system = typeof j.system === "string" ? j.system : JSON.stringify(j.system || "");
      const isTranslate = system.includes("You translate");
      modelCalls.push(isTranslate ? "translate" : "answer");
      const text = isTranslate
        ? "Bệnh thoái hóa khớp là một tình trạng của khớp — thường xuất hiện trong hơn 6 tháng. Hãy hỏi bác sĩ GP của bạn ở NSW."
        : JSON.stringify(answerJson());
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({
        id: "msg_fake", type: "message", role: "assistant", model: "fake", stop_reason: "end_turn",
        stop_sequence: null, content: [{ type: "text", text }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }));
    });
  }).listen(FAKE_PORT);

  app = spawn(process.execPath, [join(here, "index.js")], {
    env: { ...process.env, PORT: String(APP_PORT), ACCESS_CODE: CODE, ANTHROPIC_API_KEY: "fake-key",
           ANTHROPIC_BASE_URL: `http://localhost:${FAKE_PORT}` },
    stdio: "ignore",
  });
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(`${BASE}/api/config`)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("app did not start");
});
after(() => { app?.kill(); fake?.close(); });

const ask = (body, headers = { "x-access-code": CODE }) =>
  fetch(`${BASE}/api/ask`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const noFlags = { "t-septic": "no", "t-cauda": "no", "t-rash": "no", "t-gca": "no" };

test("a normal question: grounded answer, invented ids dropped, text cleaned, translated", async () => {
  modelCalls = [];
  const res = await ask({ question: "What is osteoarthritis?", condition: null, triage: noFlags, language: "Vietnamese" });
  assert.equal(res.status, 200);
  const d = await res.json();
  assert.equal(d.grounded, true);
  assert.equal(d.disposition, "SELF_MANAGE");
  assert.deepEqual(d.evidence.map((c) => c.id), ["understand-oa-what"], "the invented card id is dropped");
  assert.deepEqual(d.pointers.map((p) => p.id), [POINTER_ID], "the invented resource id is dropped");
  assert.ok(!d.framing.includes("\\u2014"), "no literal backslash-u in patient text");
  assert.ok(d.framing.includes("—"), "the em dash is restored");
  assert.ok(!d.gpQuestion.includes("\\u2014"));
  assert.equal(d.framingTranslated?.language, "Vietnamese");
  assert.match(d.framingTranslated.text, /6 tháng/);
  assert.deepEqual(modelCalls, ["answer", "translate"]);
});

test("no language asked: no translation call", async () => {
  modelCalls = [];
  const d = await (await ask({ question: "What is osteoarthritis?", triage: noFlags })).json();
  assert.equal(d.framingTranslated, null);
  assert.deepEqual(modelCalls, ["answer"]);
});

test("an emergency NEVER reaches the model, with or without a code", async () => {
  for (const headers of [{ "x-access-code": CODE }, {}]) {
    modelCalls = [];
    const d = await (await ask({ question: "hi", triage: { ...noFlags, "t-septic": "yes" }, language: "Vietnamese" }, headers)).json();
    assert.equal(d.disposition, "ED");
    assert.equal(d.redFlagOnly, true);
    assert.deepEqual(modelCalls, [], "no model call on the emergency path");
  }
});

test("typed red flags escalate even when the model says SELF_MANAGE (floor wins)", async () => {
  modelCalls = [];
  const d = await (await ask({ question: "my toe is hot and swollen and I have a fever and feel shivery", triage: noFlags })).json();
  assert.notEqual(d.disposition, "SELF_MANAGE");
  assert.deepEqual(modelCalls, []);
});
