# Co-Motion

**Helping people with chronic musculoskeletal pain get through the months between appointments.**

🔗 **Live:** [co-motion-production.up.railway.app](https://co-motion-production.up.railway.app) · the tool is at **/app** (asking a question needs the access code; browsing, the rail and the emergency path are open)

A patient is seen in clinic and given an appointment six months out. In between, they flare.
They can't get in to see anyone. Many miss the appointment anyway and wait again.

The help they need already exists — spread across Arthritis Australia, the NSW ACI Pain Network,
painHEALTH, the Pain Toolkit, healthdirect and a hundred-odd other organisations. It is
effectively unfindable from inside a flare at 2am.

Co-Motion is the front door to that material. **Browse** it by topic or **ask** a question in
your own words; get an answer drawn from endorsed Australian sources and *explained*; and get told
what to do tonight — on a five-rung scale that keeps most people safely at home and reliably sends
the dangerous minority to care.

> For the full rationale and the expert-panel review behind the current design, see
> [`docs/approach.md`](docs/approach.md).

---

## How it's built

Co-Motion is the design team's **multilingual navigator** sitting on top of a **code-enforced
safety rail**. The navigator is the friendly part; the rail is the part that must never fail.

### The rail (the part that cannot fail)

Every answer lands on one of five rungs:

| | |
|---|---|
| **1** | You can do this at home |
| **2** | Your pharmacist can help today |
| **3** | This one's for your GP, and it can wait |
| **4** | Call your GP today |
| **5** | Get seen tonight |

Two guarantees live in **code** (`server/redflags.js`, `server/index.js`), not in a prompt —
because a prompt is a request and code is a guarantee:

1. **The model can escalate a disposition but can never soften one.** The final rung is
   `max(ruleFloor, modelDisposition)`. Deterministic screens run *before* the model and set a floor.
2. **The model cannot invent health advice.** It selects from a curated library and explains it;
   any ID it invents is dropped. If nothing survives, the question is logged for the patient's
   doctor rather than answered.

If the floor is **ED**, the model is **never called at all** — the most dangerous path is instant,
cannot be reworded, and works with no API key. Three (now four) deterministic **triage questions**
run every time, on every entry point — including the new **giant cell arteritis** screen. "Not
sure" counts as yes.

### The two-tier library

- **Explain tier** — `server/evidence.js`: curated cards, each traceable to a retrieved source with
  a verbatim quote. The model **may synthesise an explanation** grounded in these.
- **Navigate tier** — `data/directory.json`: ~170 resources across the 8 domains. The model **may
  route** someone to these and say what they are, but **may not make a clinical claim** from one. If
  only navigate-tier resources match, the answer downgrades to "here's where to look."

Enforced in code: the explanation (`framing`) cites explain-tier IDs only; navigate-tier resources
come back in a separate `pointers` array.

### Multilingual — honestly

Browse and signpost in Arabic, Vietnamese, Assyrian and Chinese, with a free-interpreter card (TIS
National, 131 450) on every topic. The language switch is **truthful**: the resource sheet barely
tags resources by specific language (today only 3, all Assyrian), so the app says so plainly rather
than implying a translated service that doesn't exist. Safety-critical strings are **never**
model-translated (that's Phase 2, human-reviewed).

---

## Run it locally

```bash
npm install
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm start                 # → http://localhost:5070  (landing page /, tool /app)
npm test                  # the rail tests (server/redflags.test.js)
```

**It runs with no API key.** You lose question-answering; you keep the whole directory, the browse
spine, the rail and the entire emergency path. That is deliberate.

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | for `/api/ask` only | Question answering (`claude-opus-4-8`) |
| `ACCESS_CODE` | when deployed publicly | Gates `/api/ask`, the only endpoint that spends money. Unset = no gate (local dev). |
| `PORT` | no | Defaults to 5070. |

---

## Checking translation after a deploy

Translation needs the model, so it can only be checked with an API key and the access code.
Switch the page to Vietnamese or Arabic, ask "Can I still have a beer?" and confirm: the
explanation appears in that language first; the machine-translation label sits under it; "Show the
English original" reveals the English; the urgency level and triage questions are unchanged. Then
ask in Vietnamese ("Tôi có thể uống bia không?") and confirm the GP question in "Your log" is in
English. Unit tests for the number guard run with `npm test`.

---

## The resource pipeline (`tools/`)

The directory is built from the resource repository spreadsheet by a set of **re-runnable** Python
scripts. Raw scraped pages and downloaded PDFs are **not** committed (they're large and
third-party) — only the derived `data/directory.json` ships. Regenerate any time:

```bash
# 1. Fetch each resource page, extract clean text + metadata (idempotent, cached).
#    Falls back to a headless browser for bot-blocked / JS-rendered pages.
python tools/fetch_resources.py          # → data/catalogue.json, data/fetch_report.md

# 2. Tag each resource with the condition(s) it is actually about (Osteoarthritis,
#    Osteoporosis, Persistent Pain, Back Pain), grounded in the fetched page text.
#    Hand-checked results from the live sites live in data/conditions_overrides.json.
#    Add --xlsx PATH to also write "Condition(s)" + "Condition evidence" columns into the
#    source spreadsheet (a backup is made first).
python tools/classify_conditions.py      # → data/conditions.json

# 3. Build the app's directory (the navigate tier) from the catalogue + conditions.
python tools/build_directory.py          # → data/directory.json

# 4. (optional) Download the linked PDFs / translated files.
python tools/fetch_files.py              # → data/files/, manifest.json

# 5. (optional) Produce the team hand-off + manual-download lists.
python tools/make_handoff.py             # → data/handoff.md/.csv, data/manual_downloads.md
```

Requires `openpyxl`, `requests`, `trafilatura` (and `playwright` + `chromium` for the render
fallback). The spreadsheet path defaults to `~/Downloads/CoMotion_Resource_Repository_...xlsx`;
pass `--xlsx PATH` to override.

**Still needs manual work:** `data/manual_downloads.md` lists the resources that couldn't be fetched
automatically (bot-blocked sites, a few dead links, and the translated PDFs) — the content task for
growing real Arabic/Vietnamese coverage.

---

## Project structure

```
server/
  evidence.js    The explain tier — curated cards. No model. A clinician can read and correct it.
  directory.js   The navigate tier — loads data/directory.json. No model.
  redflags.js    The rail — five rungs, four triage questions, the pattern screen. No model.
  assistant.js   Claude as a librarian: selects + explains cards, routes to directory. Cannot add a claim.
  index.js       Enforces the two guarantees. Short-circuits ED before the model.
  redflags.test.js  Rail tests (npm test).
public/
  index.html     Landing page.
  app.html       The tool — browse-first homepage, triage, four-section answer, language switch.
tools/           The re-runnable resource pipeline (see above).
data/
  directory.json The navigate tier (committed). Raw scrapes & PDFs are gitignored.
docs/
  approach.md    The full design rationale + expert-panel review.
```

---

## Deployment

Hosted on **Railway**, deployed from this repo's `main` branch — **every push auto-redeploys.**
It's gated behind `ACCESS_CODE` and `ANTHROPIC_API_KEY`, set as Railway service variables
(never committed). `railway.toml` configures the build (`npm start`).

---

## How to contribute (for the team)

- **Adding a resource to browse?** Add it to the repository spreadsheet and re-run the pipeline
  (`fetch_resources.py` → `build_directory.py`). It becomes a navigate-tier directory entry.
- **Adding something the bot should *explain*?** That's an explain-tier card in `server/evidence.js`
  — it needs a verbatim quote and a real source, and should be clinician-reviewed. Promote by
  curation, never by dumping a link.
- **Touching the rail?** `server/redflags.js` is safety-critical. Add a test in
  `server/redflags.test.js` and run `npm test`. The rung wording and triage questions need a named
  clinical owner before real-patient use.

### Governance

Three tiers: **demo** (today's cards, behind a "prototype, not clinically reviewed" banner) →
**directory** (the browse-only links, where the claim lives on the source) → **reviewed** (cards a
GP or rheumatologist has signed off, the only ones eligible to reach real patients).

## What this is not

Not a diagnosis. Not a medical device. Not a replacement for the GP, who owns the care plan — this
exists to support that plan between visits. The library is curated from published sources but **has
not yet been signed off by a GP or rheumatologist.** The architecture assumes that review happens.
It does not substitute for it.
