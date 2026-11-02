# CoMotion — what still needs fixing

_Written 2026-11-02, after a walkthrough of the live site (co-motion-production.up.railway.app) as a
patient on a 390px phone, compared against the design team's Layer 1–4 text. Screenshots from that
walkthrough are in the session scratchpad (`patient-walkthrough/`)._

## Status — 2026-11-03

Worked through in one pass by parallel agents, then independently reviewed (spec/patient walkthrough,
data accuracy, safety). **Verified locally** (88 unit tests, 39 browser tests at 390x844 with the model
mocked, smoke test) — live verification is recorded at the bottom of this section once deployed.

| Item | Status |
|---|---|
| 1.1 first screen, 1.2 headings, 1.3 topic tap | Done — welcome 30px at 431px, first topic card at 560px, topic heading lands at top |
| 1.4 spec examples | Definition cards added (7, unreviewed); "information in a language" answered by a card, no model. **Live model answers still to be checked** |
| 1.5 rung on no-answer | Done for the info-only case; safety-net sentence kept |
| 1.6 jargon | Prompt and page text fixed; **model wording untested live** |
| 2.1 fourth section | Done: "Your next steps" |
| 2.2 nesting, 2.3 category names, 3.1–3.6 extras | Done |
| 2.4 other topics' subtopics | Left flat — decision |
| 2.5 action labels | Rewritten with strict rules; contact 76→35, discuss 8→1, watch 3→1 |
| 2.6 thin conditions | **Not fixable in code** — Back Pain 4, Osteoporosis 5, no gout resources |
| 4 directory data | Done: 163 resources, 5 removed, all titles unique, all descriptions 40–220 chars, junk downloads dropped, trusted-source ordering |
| 5 languages | Translator still needed; "trigger/cause" prompt fix untested live; safety strings still English by design |
| 6 clinical | **Open** — no clinician sign-off; every new card says "Not yet reviewed by a doctor" |
| 7 hygiene | Done: browser tests, smoke test, error messages split, `.gitattributes`, favicon |

**Found and fixed during review (not on the original list):** the access code blocked emergency
answers (fixed server-side: the code gates only the model); the "information in a language"
shortcut could skip triage for symptoms mixed in, or typed in another script (fixed, with tests).

**Still open:** clinician sign-off; translator sign-off; more resources for thin conditions; a
decision on whether information-only questions should skip triage; re-testing the live model's
wording after the prompt changes.

**How to read this**

- **P0** — a patient hits it in their first minute, or it makes the page do the wrong thing.
- **P1** — differs from the spec, or confuses a patient, but they can get through.
- **P2** — polish, hygiene, or needs a decision before it can be built.
- **Type:** `build` (code), `data` (the resource repository), `decision` (needs the user or the design
  team), `clinical` (needs a GP/rheumatologist), `translator` (needs a credentialed translator).
- **Evidence:** _observed_ = seen on the live site; _measured_ = read from the live DOM; _inferred_ =
  from reading the code, not yet watched happening.

---

## 1. What a patient hits first (P0)

### 1.1 The welcome is not the first screen — `build` — observed + measured
On an 844px-tall phone the first screen is: language buttons, title and subtitle (288px), the emergency
banner (241px), and the **Access code** card (242px). "What are you looking for today?" starts at
**945px**, below the fold. The spec's Layer 1 opens with the welcome question.
**Fix:** the access code must not occupy the first screen (see 3.1). Shrink the header/subtitle so the
welcome question and first topic tiles are visible without scrolling. Keep the emergency banner and the
"Something feels wrong right now" link above the fold — they are the safety entry points.

### 1.2 The key headings look like footnotes — `build` — observed
"What are you looking for today?", "Browse Topics" and "Or Ask a Question" render as small grey
**uppercase** labels (the page's `h2` style), the smallest text on the page. The spec's casing
("Or Ask a Question") is also lost to the all-caps style.
**Fix:** style the welcome as the page's main heading (large, dark, sentence/title case); keep the small
caps style for section labels only.

### 1.3 Tapping a topic appears to do nothing — `build` — measured + inferred
Order on the page is browse → ask box → topic list. When a topic opens, the browse tiles hide but the
ask box stays, so the list starts about **1,700px** down, while `openDomain()` scrolls the page to the
top. A patient taps "Understanding my condition" and sees the top of the page again. (I measured the
list position and read the scroll call; I did not watch the tap itself.)
**Fix:** when a topic is open, hide the ask box (or move the topic list directly under the tiles) and
scroll to the list heading, not to the top.

### 1.4 Two of the spec's four example questions get no answer — `data` / `build` / `decision` — observed
- **"What is osteoarthritis?"** → "We don't have a sourced answer for that one. … no card that defines or
  explains what osteoarthritis actually is." The library only has cards about _managing_ chronic MSK
  pain. Needs at least definition cards for osteoarthritis (and ideally osteoporosis, persistent pain,
  back pain) written from the source pages, with quotes, then clinician review.
- **"Can I get information in Vietnamese?"** → also "no sourced answer", then Vietnamese-relevant links.
  The design doc treats "information in my language" as a **language switch**, not a search. A question
  like this should be recognised and answered with: yes, here is how, and offer to switch the page to
  Vietnamese and show Vietnamese resources first.
- "How can I manage pain?" and "Where can I find support near me?" do get explanations.
- **"…near me"** cannot be answered locally — the resources are national and CoMotion has no location.
  Either ask for a postcode/state and say what we can and can't do, or state plainly that these are
  nationwide services.

### 1.5 A "no answer" is shown under a green "Level 1 of 5 — You can do this at home" banner — `build` / `clinical` — observed
For an information question with no sourced answer, the page leads with the rung banner ("You can do
this at home. If it's worse tomorrow … ring your GP"), then "We don't have a sourced answer", then
"It's gone in your log with today's date, so you can put it to the doctor". Putting "What is
osteoarthritis?" in the GP log is odd, and a rung verdict on a non-medical question is noise.
**Fix:** for questions with no medical content and no flags, lead with the answer (or the "where to
look" help) and drop the rung and the log line. Rung wording is a clinical decision — see section 6.

### 1.6 Internal jargon reaches the patient — `build` — observed
The no-answer text said: "The library's **explain-tier cards** are written in English…". That sentence is
model-written (`unansweredReason`). The prompt should forbid internal terms (explain tier, navigate
tier, cards, directory) and require plain words. Also check the footer (see 3.5).

---

## 2. Differences from the spec (P1, mostly `decision`)

### 2.1 Layer 4 says "four sections" but lists three — `decision`
Spec lists: What we found · Related topics · Trusted resources highlighting what you can do next. The
earlier design text also had **next steps**. We show three. A "Where to go next" block exists but only
on no-answer results. **Decide** what the fourth section is, then build it for every answer.

### 2.2 Browse topics: nested in the spec, flat on the site — `decision` / `build`
The Layer 1 list nests (e.g. "Managing symptoms" under "Understanding my condition"). We show eight flat
tiles. Decide whether to nest; if so, define the exact parent/child pairs.

### 2.3 Layer 2 typed-query category names — `decision` / `build`
The spec says "My knee pain is getting worse" maps to **Condition Information, Pain Management, Service
Navigation**. The page shows our own topic names ("Related topics": Understanding my condition,
Finding services and support, …) — up to six chips per answer. Proposed mapping: Condition Information ←
Understanding my condition; Pain Management ← Managing symptoms; Service Navigation ← Finding services
and support. Needs confirmation, then a live-model test (it depends on the model's `domains` output).

### 2.4 Browse drills only into conditions, only under one topic — `decision`
Only "Understanding my condition" opens to conditions (Osteoarthritis 7, Osteoporosis 6, Persistent
Pain 14, Back Pain 4). Other topics open to a flat list. The spec only shows the one example; decide
whether other topics should open to their own subtopics from the spreadsheet (e.g. Managing symptoms →
Pain, Fatigue, Sleep…). Note the spreadsheet defines subtopics that currently have no resources
(Fatigue, Pacing, Referral, Careplan, Specialist, Causes and risk factors, Arabic/Chinese/Vietnamese).

### 2.5 Action labels are guessed — `build` / `data`
Read / Watch / Contact/join / Discuss are inferred from the topic and link shape because the repository
has no media type. "Watch" only fires on video-looking links, so it will rarely appear and may be wrong.
**Fix:** add an explicit "what you can do" column to the repository and use it.

### 2.6 Condition counts are thin — `data`
29 of 169 resources carry a confirmed condition; Back Pain has 4. This is the repository, not the code.
More back pain / osteoporosis / osteoarthritis resources need to be added (by the design team or from a
wider search). Also: the Arthritis Australia "Understanding arthritis" page was **not** confirmed for
osteoarthritis by the live check (recorded as listing-only, excluded from browsing).

---

## 3. Extras to remove or restructure (P1)

### 3.1 Access-code card on the first screen — `build` / `decision`
A demo gate protecting the API key. Before real patients: remove it from the patient view (e.g. gate the
whole app at the door, or rate-limit the endpoint server-side) so it never appears on the first screen.
Rotate the code used during testing.

### 3.2 Language chip row above the topic tiles — `build`
"All / Arabic / Vietnamese / Assyrian / Chinese" has no label and duplicates the top language switch
(English / Tiếng Việt / العربية). Either label it ("Show resources in:") and keep it, or remove it and
fold it into the language switch.

### 3.3 "This is about:" condition chips under the search box — `decision` / `build`
Five buttons (Gout, Osteoarthritis, Back pain, Rheumatoid arthritis, Other) ask a frightened person to
pick a condition before asking, which conflicts with "without requiring the user to know categories".
They also silently narrow which cards the model sees. The placeholder text is gout-specific even while
"Other" is selected. Not in the spec. Recommend removing and letting the model infer.

### 3.4 About 7,000px of content below the ask box that is not in the spec — `decision` / `build`
The page is **10,717px** tall (19,000px with a topic open). Below "Or Ask a Question":
- "The thing to ask your GP for" (chronic condition management plan card)
- "Your log"
- "Things you can do today, without an appointment" (support lines)
- "Browse everything" (accordion of topics)
- "Go to an emergency department if any of this is happening" — about 2,000px of red-flag cards
- The sources footer (about 1,000px)
Decide what stays. Suggestion: keep the emergency checklist (collapsed, linked from the banner), show the
GP-plan card and log only after an answer, move sources and "Browse everything" behind a "More" link.

### 3.4a The page shows the condition-specific block before any question is asked — `build`
The block in 3.4 renders for the default "Other musculoskeletal pain" chip on first load. It should only
appear in context.

### 3.5 Builder-voiced text in the footer — `build`
"Every card in Co-Motion comes from one of these Australian sources. **Nothing else is admissible.**" …
"mined for cards" … "paraphrasing a page we have not actually read is **the exact failure this library
exists to prevent**." Written for the design team, not patients. Rewrite second-person and plain. Keep
the honest "prototype, not yet signed off by a GP or rheumatologist" statement, in plain words.

### 3.6 Favicon 404 — `build`
Every page load logs a 404 for `/favicon.ico`. Add one.

---

## 4. Resource directory data (P1, `data`)

Found in the live directory (`data/directory.json`, built from the spreadsheet):

| Problem | Size | Example |
|---|---|---|
| Scraped error pages used as titles | 2 | "403 Forbidden", "404" |
| Generic title "Home" | 7 resources | several different organisations all titled "Home" |
| Generic/duplicate titles | more | "Homepage" ×2, "Chronic Pain" ×2, "Find a health service" ×2 |
| Empty / jargon / very short descriptions | **67 of 169** | "All subdomains", "All domains", "Peer support", "Hotline", "Physical activity", "403 Forbidden nginx" |
| Same organisation listed twice | at least 3 | Arthritis & Osteoporosis NT (with and without trailing slash), Chronic Pain Australia, RA support program |
| Unlabelled "file 1 / file 2" download links | 42 resources | "Downloads: file 1 file 2 file 3 file 4" |
| Listing order | all | alphabetical, so an unrelated organisation tops "Understanding my condition" |
| Pages the fetcher could not read | 4 | Women With Disabilities Australia; Aboriginal & Torres Strait Islander healthy eating guide; UK Ankylosing Spondylitis Society; RACGP osteoarthritis attachment (tagged from its web address) |

**Fix:** use the spreadsheet's Author as the title when the page title is generic or an error; write a
real one-line description for every resource (the spreadsheet's "Description" column is often blank or
holds subtopic labels); de-duplicate by organisation; label download links with their file name; order
each list by relevance (condition-tagged and Australian-NSW first); re-fetch the unreadable pages or mark
them manual. The classifier and builder are re-runnable (`tools/classify_conditions.py`,
`tools/build_directory.py`).

---

## 5. Languages (P1, `translator` / `build`)

- **Safety strings stay English on Arabic/Vietnamese pages.** The emergency banner, rung verdict
  ("You can do this at home"), triage questions and red-flag text are English until a credentialed
  translator and a clinician sign them off. Handoff sheet: `docs/translation-handoff.md` (52 safety
  strings, plus 64 interface strings, 11 examples, and 5 added today). The triage wording lives only in
  `server/redflags.js` and needs locale keys before a translator can work on it.
- **A translation slip was observed.** One Vietnamese answer rendered "alcohol is a direct **trigger** for
  gout" as a direct **cause** of the disease. The number guard cannot catch meaning errors. Options: tell
  the translation step to keep "trigger/set off an attack" distinct from "cause" (small prompt change,
  still needs a native reviewer), and require human review of a sample before real use.
- **Typed questions in Arabic/Vietnamese skip the keyword red-flag screen** (it reads English). The four
  triage questions, asked every time, are the safeguard; they are in English on those pages. Translate
  and sign off the triage questions first.
- **Interface text is unreviewed machine translation** (Arabic RTL layout also unreviewed by a native
  reader; arrow glyphs flagged in the file).
- **Example prompts are not translated** — an Arabic/Vietnamese page shows the four English examples.
- **Two language controls** (the top switch and the resource-language chips) — see 3.2.
- "Can I get information in Vietnamese?" should switch the language — see 1.4.

---

## 6. Clinical and governance (P0 before real patients, `clinical`)

- **No GP or rheumatologist has signed off** the library, the five rung wordings, or the triage
  questions. The page already says "Prototype … not yet signed off". This blocks any real-patient use.
  First ask: a short, bounded session on the highest-risk items — the rungs and the triage questions.
- **The giant cell arteritis screen is new and unreviewed.**
- **The triage screen appears for every question**, including "What is osteoarthritis?", adding a
  1,400px screen before any answer. This is the safety design; the open question is whether information-
  only questions should skip it. Needs a clinical view, not just a design one.
- **Translated safety strings** need the translator + clinician pairing in section 5.
- **Library coverage:** definition cards (1.4) and any new cards need a verbatim source quote and date
  before they can be explained; nothing is auto-promoted.

---

## 7. Engineering hygiene (P2, `build`)

- **No client-side tests.** A one-line bug (`(r.tags || []).join` on an object) broke every answer that
  included resource links, for everyone, from the Layer 4 commit until today's fix, and the unit tests
  did not catch it because they only cover the server. Add a browser test (Playwright) that renders
  answers with and without pointers, and a smoke test that runs after each deploy.
- **The render error was reported as "Couldn't reach the server".** The page's catch-all hides real
  errors. Show a different message for a page error than a network error, and log it.
- **Update the docs:** `docs/approach.md` and the README still say translation is "not yet tested against
  the live model". It has now been tested (Vietnamese and Arabic, live, 2026-11-02); update both once the
  fixes above land.
- **Backups left on this machine:** the original spreadsheet is backed up as
  `Downloads\CoMotion_Resource_Repository_…_BACKUP_before_conditions.xlsx`; delete when no longer needed.
- **Line endings:** git warns that LF will become CRLF on every changed file. Add a `.gitattributes`.
- **Safeguard:** `tools/classify_conditions.py --xlsx` writes into the source spreadsheet. It makes a
  backup first and reuses its own columns on re-run — keep it that way.

---

## 8. Suggested order of work

1. **Before the next demo (P0, build):** 1.1, 1.2, 1.3, 1.5, 1.6, 3.1 — fix the first minute.
2. **Data clean-up (P1, data + a small build step):** section 4. Makes every list readable.
3. **Content (P0 for the spec's examples):** 1.4 — definition cards and the "information in my
   language" behaviour.
4. **Decisions needed from the user/design team:** 2.1, 2.2, 2.3, 2.4, 3.3, 3.4.
5. **Clinical and translator sessions:** sections 5 and 6 — these are the gate to real patients.
6. **Hygiene:** section 7, including the browser test.
