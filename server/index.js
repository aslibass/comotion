import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readdirSync, readFileSync } from "node:fs";

import {
  CONDITIONS,
  DOMAINS,
  SOURCES,
  PROVENANCE,
  EVIDENCE,
  evidenceFor,
  supportsFor,
  byId,
} from "./evidence.js";
import { screen, triageScreen, higher, RUNGS, TRIAGE, ALWAYS_VISIBLE } from "./redflags.js";
import { answer, isConfigured } from "./assistant.js";
import { translateFraming, TRANSLATE_TO } from "./translate.js";
import { unescapeUnicode } from "./text.js";
import { DIRECTORY, CONDITIONS_LIST, dirById, resourcesForDomain, directoryForModel } from "./directory.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// AVAILABLE UI LOCALES. Read once at boot from public/locales/*.json. We expose only the
// `meta` of each — code, endonym, direction, and whether a credentialed translator has
// verified it — so the client's language switch offers exactly the locales that exist and
// can label the unverified ones honestly. English is the source of truth; everything else
// falls back to it key by key on the client, so a partial locale is safe to ship.
function loadLocaleMeta() {
  const dir = join(__dirname, "../public/locales");
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          const meta = JSON.parse(readFileSync(join(dir, f), "utf8")).meta || {};
          return { code: meta.code || f.replace(/\.json$/, ""), name: meta.name || meta.code,
                   endonym: meta.endonym || meta.name || meta.code, dir: meta.dir || "ltr",
                   verified: meta.verified === true, resourceLanguage: meta.resourceLanguage || null };
        } catch (err) {
          console.warn(`locale ${f} did not parse — skipping:`, err.message);
          return null;
        }
      })
      .filter(Boolean)
      // English first, then the rest alphabetically by endonym.
      .sort((a, b) => (a.code === "en" ? -1 : b.code === "en" ? 1 : a.endonym.localeCompare(b.endonym)));
  } catch {
    return [{ code: "en", name: "English", endonym: "English", dir: "ltr", verified: true, resourceLanguage: null }];
  }
}
const LOCALES = loadLocaleMeta();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(join(__dirname, "../public")));

// The tool lives at /app; the landing page is the static index.html at /. Without this
// route, express.static only serves it at /app.html — and the landing page's only call
// to action points at /app.
app.get("/app", (req, res) => res.sendFile(join(__dirname, "../public/app.html")));

// Browsers ask for /favicon.ico regardless of the <link>; point them at the SVG.
app.get("/favicon.ico", (req, res) => res.redirect(301, "/favicon.svg"));

// The deployed app is public and /api/ask spends real money on a personal API key.
// Gate that endpoint and only that one — browsing the library, the red-flag rail and
// the questions list all stay open, so a fumbled code can never dead-end a patient (or
// a demo). If ACCESS_CODE is unset (local dev) the gate is a no-op.
const ACCESS_CODE = process.env.ACCESS_CODE || "";

function requireCode(req, res, next) {
  if (!ACCESS_CODE) return next();
  if (req.get("x-access-code") === ACCESS_CODE) return next();
  res.status(401).json({
    error: "Access code required to ask a question. You can still browse the library.",
    needsCode: true,
  });
}

app.get("/api/config", (req, res) => {
  res.json({
    assistantAvailable: isConfigured(),
    codeRequired: Boolean(ACCESS_CODE),
    // The UI locales that exist on disk. The client loads /locales/<code>.json on demand.
    locales: LOCALES,
    conditions: CONDITIONS,
    cardDomains: DOMAINS,
    sources: SOURCES,
    provenance: PROVENANCE,
    rungs: RUNGS,
    triage: TRIAGE,
    redFlags: ALWAYS_VISIBLE,
    // The browse spine: the eight directory domains + the languages we can filter by.
    domains: DIRECTORY.domains,
    languages: DIRECTORY.languages,
    languageCounts: DIRECTORY.languageCounts,
    resourceCount: DIRECTORY.resource_count,
  });
});

// THE BROWSE SPINE. Pure data, no model, no API key — the navigate tier of the library.
// `?language=Arabic` re-ranks in-language resources first (each still honestly labelled).
app.get("/api/directory", (req, res) => {
  res.json({ domains: DIRECTORY.domains, languages: DIRECTORY.languages });
});

app.get("/api/directory/:key", (req, res) => {
  const { key } = req.params;
  const domain = DIRECTORY.domains.find((d) => d.key === key);
  if (!domain) return res.status(404).json({ error: "Unknown domain." });
  // ?condition=back-pain — the drill-down under "Understanding my condition".
  const condition = CONDITIONS_LIST.some((c) => c.key === req.query.condition) ? req.query.condition : "";
  const { list, tagged } = resourcesForDomain(key, { language: req.query.language, condition });
  res.json({
    domain, resources: list, taggedInLanguage: tagged, language: req.query.language || "",
    // Only the "Understanding my condition" domain browses by condition.
    conditions: key === "understanding" ? CONDITIONS_LIST : [],
    condition,
  });
});

app.post("/api/unlock", requireCode, (req, res) => res.json({ ok: true }));

// The library. Deterministic, instant, no API key required. This endpoint is the one
// that must never break — with the model switched off entirely, a patient can still
// browse every card and every support service, which is most of the value.
app.get("/api/library/:condition", (req, res) => {
  const { condition } = req.params;
  if (!CONDITIONS[condition]) return res.status(404).json({ error: "Unknown condition." });
  res.json({
    condition: CONDITIONS[condition],
    evidence: evidenceFor(condition),
    supports: supportsFor(condition),
  });
});

// THE RAIL. Two guarantees are enforced here, in code, rather than requested in a
// prompt — because a prompt is a request and code is a guarantee.
//
//   1. The model can escalate but never soften. The deterministic red-flag screen runs
//      FIRST and sets a floor; the final disposition is max(floor, model). A hot swollen
//      joint with a fever goes to ED even if the model is busy answering a question
//      about beer.
//
//   2. The model cannot invent advice. Every card ID it returns is checked against the
//      library for this condition, and anything it made up is dropped. If nothing
//      survives, the answer is not shown as guidance at all — it is parked on the
//      questions list instead. The failure mode is "we don't know", never a confident
//      fabrication.
app.post("/api/ask", async (req, res) => {
  const question = req.body?.question?.trim();
  // Condition is now optional: the browse-first homepage asks without the person first
  // declaring a condition. When one is supplied (from a condition-specific context) it
  // narrows the explain-tier cards; otherwise the model sees them all.
  const condition = CONDITIONS[req.body?.condition] ? req.body.condition : null;

  if (!question) return res.status(400).json({ error: "No question supplied." });

  // Two independent screens, both deterministic, both running before the model and with
  // or without an API key:
  //
  //   screen()       — patterns over what they typed
  //   triageScreen() — the three questions we ASKED them, because what they typed
  //                    cannot be relied on. "Shivery" is not "fever", and the person
  //                    who does not know which word matters is exactly the person this
  //                    has to catch.
  //
  // The floor is the higher of the two.
  const typed = screen({ condition, question });
  const asked = triageScreen(req.body?.triage);
  const floor = higher(typed.floor, asked.floor);
  const flags = [...asked.flags, ...typed.flags];

  // THE SHORT CIRCUIT. If the deterministic screens say this person needs to be seen
  // tonight, we answer instantly and we do not call the model at all.
  //
  // Three reasons, in order of importance. It cannot be delayed by a slow model on 4G
  // at 2am. It cannot be softened, reworded, or buried under lifestyle advice by a
  // model that misjudges the room. And it cannot fail because an API key expired or a
  // bill went unpaid. The most dangerous path in this product is the one with the
  // fewest moving parts, and no language model anywhere near it.
  if (floor === "ED") {
    return res.json({
      question,
      grounded: false,
      redFlagOnly: true,
      disposition: "ED",
      rung: RUNGS.ED,
      flags,
      evidence: [],
      // Still worth capturing — they will want to tell someone what happened.
      gpQuestion: `[Flare on ${new Date().toLocaleDateString("en-AU")}] ${question}`,
      parked: true,
    });
  }

  // THE ACCESS CODE GATES THE MODEL, NEVER SAFETY. The code protects the API key from
  // strangers; it must not stand between a frightened person and "get seen tonight". So it is
  // checked only here — after the deterministic screens have run and after the ED short-circuit.
  // Without a valid code: if the screens raised the floor at all (ED already answered above;
  // this covers "call your GP today" etc.) we still answer deterministically — no model, no
  // code, same shape as the ED answer. Only an ordinary question needs the code.
  const codeOk = !ACCESS_CODE || req.get("x-access-code") === ACCESS_CODE;
  if (!codeOk) {
    if (floor !== "SELF_MANAGE") {
      return res.json({
        question,
        grounded: false,
        redFlagOnly: true,
        disposition: floor,
        rung: RUNGS[floor],
        flags,
        evidence: [],
        gpQuestion: `[Flare on ${new Date().toLocaleDateString("en-AU")}] ${question}`,
        parked: true,
      });
    }
    return res.status(401).json({
      error: "Access code required to ask a question. You can still browse the library.",
      needsCode: true,
    });
  }

  if (!isConfigured()) {
    return res.status(503).json({
      error: "No ANTHROPIC_API_KEY set — question answering is unavailable. Browse the library instead.",
      screen: { floor, flags },
    });
  }

  const cards = condition ? evidenceFor(condition) : EVIDENCE;

  try {
    const raw = await answer({
      question,
      condition,
      conditionLabel: condition ? CONDITIONS[condition].label : "chronic musculoskeletal pain",
      cards,
      directory: directoryForModel(),
      screen: { floor, flags },
    });

    // The model sometimes double-escapes a character (a literal "—" instead of "—"), which
    // the page would print as-is. Turn any such sequence back into the character it names.
    for (const k of ["framing", "unansweredReason", "gpQuestion"]) {
      if (typeof raw[k] === "string") raw[k] = unescapeUnicode(raw[k]);
    }

    // Guarantee 2: drop every EXPLAIN-TIER card the model invented. (No condition filter
    // now that a question can span the whole library — only that the ID is real.)
    const cited = (raw.evidenceIds || []).map(byId).filter(Boolean);

    // NAVIGATE-TIER pointers: validated against the directory the model was shown, and
    // kept in a separate array so they can never be read as a cited source.
    const pointers = (raw.pointerIds || []).map(dirById).filter(Boolean).slice(0, 4);

    // Grounded only when a real card survives. If nothing does, the answer downgrades to
    // pointer mode ("here's where to look") rather than an ungrounded explanation.
    const grounded = cited.length > 0 && raw.answerable;

    // Guarantee 1: the rule engine's floor wins. The model may raise the disposition,
    // never lower it.
    const disposition = higher(floor, raw.disposition || "SELF_MANAGE");

    // Translate, if the reader asked for another language. Only the explanation, only on a
    // grounded answer, and only after the disposition is fixed — so translation can never
    // change where someone is sent. Null means "show the English".
    const wantLang = String(req.body?.language || "");
    const framingTranslated = grounded ? await translateFraming(raw.framing, wantLang) : null;
    // Log the reason class only — never the user's text.
    if (grounded && wantLang && wantLang !== "English" && !framingTranslated) {
      console.warn(
        `translation requested but not returned: ${TRANSLATE_TO.has(wantLang) ? "failure or numbers/terms did not survive (see translate log)" : "unsupported language"}`,
      );
    }

    res.json({
      question,
      grounded,
      framing: grounded ? raw.framing : null,
      framingTranslated,
      unansweredReason: raw.unansweredReason,
      evidence: cited,
      pointers,
      domains: Array.isArray(raw.domains) ? raw.domains : [],
      disposition,
      rung: RUNGS[disposition],
      // Said in words, not staged as an animation. An unexplained escalation gets
      // ignored; an explained one gets acted on.
      raisedByRule: raw.disposition && higher(floor, raw.disposition) !== raw.disposition,
      modelSaid: raw.disposition ? RUNGS[raw.disposition]?.label : null,
      flags,
      gpQuestion: raw.gpQuestion,
      // Anything the library could not answer does not evaporate — it becomes the thing
      // they walk in with. That is the whole point of a six-month wait.
      parked: !grounded,
    });
  } catch (err) {
    console.error("ask failed:", err);
    res.status(502).json({ error: "We couldn't get an answer just now. Please try again.", screen: { floor, flags } });
  }
});

const PORT = process.env.PORT || 5070;
app.listen(PORT, () => {
  console.log(`\n  Co-Motion  →  http://localhost:${PORT}`);
  console.log(
    isConfigured()
      ? "  Question answering: enabled (claude-opus-4-8)\n"
      : "  Question answering: DISABLED (no ANTHROPIC_API_KEY) — library + red-flag rail still work\n",
  );
});
