// Post-deploy smoke test. No dependencies beyond Node 20's fetch.
//   node tools/smoke.mjs [baseUrl]          (default http://localhost:5070)
// With env SMOKE_CODE set, also checks the code-gated ED path (which never calls the model).
// The code is read from the environment only and is never printed.
const base = (process.argv[2] || "http://localhost:5070").replace(/\/+$/, "");
let failed = 0;

async function check(name, fn) {
  try {
    const detail = await fn();
    console.log(`PASS  ${name}${detail ? ` (${detail})` : ""}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}: ${err.message}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
async function get(path) {
  const r = await fetch(base + path);
  return r;
}
async function getJson(path) {
  const r = await get(path);
  assert(r.ok, `HTTP ${r.status}`);
  return r.json();
}

let cfg = null;

await check("GET /app returns the page", async () => {
  const r = await get("/app");
  assert(r.status === 200, `HTTP ${r.status}`);
  assert((await r.text()).includes("What are you looking for today?"), "welcome heading missing from html");
});

await check("GET /api/config: 8 domains, locales en/vi/ar", async () => {
  cfg = await getJson("/api/config");
  assert(cfg.domains?.length === 8, `${cfg.domains?.length} domains`);
  const codes = (cfg.locales || []).map((l) => l.code);
  for (const c of ["en", "vi", "ar"]) assert(codes.includes(c), `locale ${c} missing (have ${codes})`);
});

for (const d of cfg?.domains || []) {
  await check(`GET /api/directory/${d.key} has resources`, async () => {
    const j = await getJson(`/api/directory/${d.key}`);
    assert(j.resources?.length > 0, "no resources");
    return `${j.resources.length}`;
  });
}

await check("GET /api/directory/understanding?condition=back-pain > 0", async () => {
  const j = await getJson("/api/directory/understanding?condition=back-pain");
  assert(j.resources?.length > 0, "no resources");
  return `${j.resources.length}`;
});

for (const c of ["en", "vi", "ar"]) {
  await check(`/locales/${c}.json parses`, async () => {
    const j = await getJson(`/locales/${c}.json`);
    assert(j.meta?.code === c, `meta.code is ${j.meta?.code}`);
    assert(j.ui && Object.keys(j.ui).length > 10, "ui strings missing");
  });
}

await check("GET /favicon.svg", async () => {
  const r = await get("/favicon.svg");
  assert(r.status === 200, `HTTP ${r.status}`);
});

const CODE = process.env.SMOKE_CODE;
if (CODE) {
  await check("POST /api/ask ED path (no model): ED, redFlagOnly, no translation", async () => {
    assert(cfg?.triage?.length, "no triage ids from /api/config");
    const triage = Object.fromEntries(cfg.triage.map((t) => [t.id, "yes"]));
    const r = await fetch(base + "/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json", "x-access-code": CODE },
      body: JSON.stringify({ question: "smoke test", condition: null, triage, language: "Vietnamese" }),
    });
    assert(r.status !== 401, "access code rejected");
    assert(r.ok, `HTTP ${r.status}`);
    const j = await r.json();
    assert(j.disposition === "ED", `disposition ${j.disposition}`);
    assert(j.redFlagOnly === true, "redFlagOnly not true");
    assert(!j.framingTranslated, "framingTranslated present on ED path");
  });
} else {
  console.log("SKIP  POST /api/ask ED path (set SMOKE_CODE to run)");
}

console.log(failed ? `\n${failed} check(s) FAILED against ${base}` : `\nAll checks passed against ${base}`);
process.exitCode = failed ? 1 : 0;
