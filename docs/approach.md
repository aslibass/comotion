# CoMotion — What It Is and Our Approach

_As of 2026-11-01_

> **Status:** Phase 1 is **built and deployed** — live at
> [co-motion-production.up.railway.app](https://co-motion-production.up.railway.app), source at
> [github.com/aslibass/comotion](https://github.com/aslibass/comotion) (pushes to `main`
> auto-redeploy). The browse-first homepage, 169-resource directory, honest multilingual view,
> two-tier ask, and the giant cell arteritis screen are all live. Phase 2 (model-generated
> in-language summaries, human-reviewed translated safety strings, promotion of curated cards) and
> the content work to grow real Arabic/Vietnamese coverage are the next steps.

## The problem

Someone with chronic musculoskeletal pain is seen in clinic and given an appointment six months
away. In between, they flare — and they cannot get seen. Many miss the appointment anyway and
wait again.

The guidance that would carry them through those months already exists, spread across a dozen
Australian organisations — Arthritis Australia, the ACI Pain Network, painHEALTH, healthdirect
and others. From inside a flare at 2am it is effectively unfindable.

The person we build for is often 50 or older, frequently male, usually on a dimmed phone, in pain
and frightened. Many come from culturally and linguistically diverse communities and read English
as a second language. CoMotion is the front door to that scattered material, for exactly that person.

## What CoMotion is today

Today CoMotion is a narrow, deep safety-triage tool, and its safety lives in code, not in a prompt.

Every answer lands on one of five rungs: do this at home · your pharmacist can help today · this is
for your GP and can wait · call your GP today · get seen tonight. The goal is to keep most questions
on the first two rungs — because this person *cannot* get an appointment, so routing them to a GP
they can't see is a dead end that ends in an emergency department.

Two guarantees are enforced in code, not requested in a prompt:

- **The model can escalate a disposition, but can never soften one.** The final rung is
  `max(ruleFloor, modelDisposition)`. Deterministic screens run *before* the model and set a floor it
  cannot lower.
- **The model cannot invent health advice.** It is handed curated evidence cards and may only select
  from them and explain them. Any card it invents is dropped before the answer is shown; if nothing
  survives, the question is written into the patient's log for their doctor rather than answered.

Two more things make it safe. If the floor is *get seen tonight*, **the model is never called at all**
— that path is instant, cannot be reworded, and works with no API key. And three red-flag questions
(a hot, feverish joint; new numbness or loss of bladder/bowel control; a rash or mouth ulcers on a
new medicine) are asked **every time**, because free text misses them — "not sure" counts as yes.

The library is a closed set of cards, each traceable to a page we actually retrieved, most carrying a
verbatim quote. An earlier draft written from the model's own recall was thrown away: fluent, mostly
right, and uncheckable. One typeface designed for low vision, a 20px base, and a rule that colour
never carries urgency round it out.

## The design team's vision, and the content to fill it

The design team's architecture widens CoMotion from a triage tool into a multilingual navigator, and
the resource repository brings the content to fill it.

The architecture has five layers: a **homepage** (a welcome, browsable topics, and an ask box); a
**navigation engine** that maps what someone types to the right category without them knowing the
category names; a **conversation layer** that interprets, retrieves, summarises, translates and shows
its sources; a **resource display** with four parts (what we found · related topics · trusted
resources to read, watch, contact or discuss · next steps); and a **safety and governance layer**
running underneath.

It browses across eight domains: understanding my condition · managing symptoms · improving my health
and wellbeing · practical self-management · finding services and support · programs, apps and
community resources · preparing for healthcare appointments · information in my language.

The repository behind it holds about **170 unique resources across 290 rows** — a resource is listed
once for each domain and subdomain it serves — drawn from roughly 148 organisations, each tagged by
domain, subdomain and audience (patient, carer, or healthcare professional).

Multilingual support targets **Arabic and Vietnamese**. The team is explicit that even where the
underlying resources are not translated, the community said that knowing *where to go*, in their
language, is itself valuable. So this is wayfinding and explanation in-language — not a promise that
every resource has been translated.

## Our approach: the navigator on top of the safety floor

We build the design team's navigator on top of the existing safety floor — not instead of it. A
five-expert panel (clinical safety, health information architecture, AI architecture, multilingual
equity, and product delivery) reviewed the two options and chose this one unanimously.

The way to read it: **the design team's five-layer architecture is the product; Layer 5, safety and
governance, is implemented as code-enforced floors rather than a list of things the model is asked
not to do.** Their homepage, browse taxonomy, four-section answer and in-language support are all
built. What sits underneath is the rail.

We did not build the softer alternative — a pure navigator whose only guard is a "cannot diagnose,
cannot recommend treatment" list — because for this audience it is a safety regression. That list is
a request to the model. The frightened person who types "my toe is hot and I feel shivery" needs the
interface to *notice*, whatever they type, and a browse-first navigator with no triage can hand them a
self-management page while a joint infection destroys the joint in a day. The current build already
caught this exact case slipping past a text filter, which is why three questions are asked every time.
Swapping a guarantee in code for a disclaimer in prose is the one trade we won't make.

### How any question reaches an answer

```
   Ask a question      Browse        In-language
          \               |               /
           \              |              /
            +------------>+<------------+
                          v
        Triage questions + red-flag screen
        (run once per session, set a floor)
                          v
                   Seen tonight? ───yes──▶  Emergency answer
                          |                 (no model, instant)
                          no
                          v
        Model explains from the curated library
              final rung = max(floor, model)
                          v
             Verb-first answer + sources
```

Any input that carries a disposition — typed, browsed, or in another language — funnels through the
same floor; only the emergency branch skips the model entirely.

## The principles we won't compromise

- **Safety lives in code, not in a prompt.** A prompt is a request; code is a guarantee. The
  disposition floor and the library allowlist are both enforced server-side.
- **The model can escalate, never soften.** Every answer is `max(floor, model)`.
- **Synthesise from retrieved source text, never from the model's memory.** If we haven't retrieved
  and quoted a page, the model doesn't get to characterise it.
- **The triage floor runs on every entry point.** Ask box, browse tap, or in-language query — any
  response that carries a disposition passes through the same screen. Browsing itself stays inert: no
  model, no disposition, just curated links.
- **Colour never carries urgency.** The verb does. (Colour vision loss is common in this demographic,
  and phones run warm at 2am.)
- **The honest failure mode is "we don't know — here's a person to ask," never a confident fabrication.**

## Multilingual, done honestly

In Arabic and Vietnamese we navigate and explain — but we never let the model author safety or
clinical content in-language.

- **The safety-critical strings are fixed and human-translated.** The five rung verbs, the three
  triage questions, the "not sure counts as yes" rule and the emergency message are translated by a
  credentialed translator, checked by a clinical or community reader, and version-controlled like the
  library. The model never translates them at runtime. A machine mistranslating "get seen tonight"
  into "you can wait" would corrupt the floor itself.
- **Every AI-translated explanation is labelled as machine translation**, from English sources, with a
  one-tap view of the English original — so the reader (or their pharmacist, GP or interpreter) can
  check it. We never describe CoMotion as a translated service.
- **"Information in my language" is a language switch, not a shelf.** A Vietnamese speaker with gout
  wants gout information in Vietnamese, not a separate list of thirty items walled off from the other
  hundred-plus resources. Choosing a language re-ranks everything and labels each resource honestly
  ("available in Vietnamese" vs "English only — we can explain it").
- **Interpreter access is first-class.** TIS National (131 450) and healthdirect, with a short "say
  this on the phone" script, sit as fixed content on the pharmacist and GP rungs. This attacks the
  appointment barrier directly — which is the whole reason CoMotion exists.
- **Arabic needs real typographic work:** right-to-left layout, Latin islands for drug names, URLs and
  phone numbers, and a proper Arabic font. The single-typeface rule relaxes here.

## Building the library from the resources themselves

We build the library from the resources themselves, with a script that can be re-run as the list
changes (`tools/fetch_resources.py`).

The fetcher reads the repository, de-duplicates the 290 rows to their unique URLs, visits each page,
and extracts clean main-text plus metadata — title, published date, and page language. It is
idempotent: pages are cached and the whole run is re-runnable, and each run writes a report of what
failed, which rows still have no description, and which pages look stale. (That stale-date check
matters — curation already caught one resource still using a Medicare plan name retired in July 2025.)

The library is then split into two tiers, and the tiers are enforced in code:

- **Explain tier** — a curated subset extracted into cards that carry a verbatim quote and a link. The
  model *may* synthesise an explanation grounded in these.
- **Navigate tier** — the long tail, held as link-only directory rows. The model *may* route someone to
  them and say what they are, but *may not* make a clinical claim from one. If only navigate-tier
  resources match a question, the answer downgrades to "here's where to look" rather than becoming an
  explanation.

Nothing auto-promotes. A resource becomes explainable only when a human has attached a source quote
and a date to it, and clinical sign-off follows. The download gathers raw material for curation; it is
not a pipeline that puts pages in front of patients.

## Phasing and governance

Phase 1 shows the design team their architecture working, without claiming more than the content
supports.

**Phase 1 (now):** the browse-first homepage on the eight domains; the ~170 resources as a cleaned,
browse-only directory; free-text mapped to categories; the four-section answer; the rail, triage
questions and emergency path unchanged and on every path; a new screen for giant cell arteritis (a red
flag the wider musculoskeletal audience will surface); and Domain 8 shipped as a language-filtered
browse, so "Can I get information in Vietnamese?" is answered truthfully today with the resources that
genuinely exist in-language.

**Phase 2:** model-generated in-language summaries (labelled); human-reviewed translated safety
strings; and promotion of curated resources into explain-tier cards in tranches, driven by what people
actually ask.

**Governance runs as three visible tiers:**

- **Demo tier** — today's cards, shown in workshop mode behind a plain "prototype, not yet clinically
  reviewed" banner.
- **Directory tier** — the browse-only links, lower risk because the claim lives on the source, not on us.
- **Reviewed tier** — cards a GP or rheumatologist has signed off, the only ones eligible to reach real
  patients.

Two things need an owner before this goes further: the rung wording and the three triage questions are
clinical decisions that currently have no named clinical sign-off. That is the first ask of the
reviewing clinician — a short, bounded session on the highest-risk items, not "please read 170
resources."

## What CoMotion is not

CoMotion is not a diagnosis, not a medical device, and not a replacement for the GP — who owns the care
plan. It exists to carry the patient through the months between visits and to support that plan, not to
stand in for it.

The library is curated from published Australian sources and is **not yet signed off by a GP or
rheumatologist**. The architecture assumes that review happens; it does not substitute for it.

---

## Open decision

The panel flagged **giant cell arteritis** as a red flag we don't screen for yet. Commit it to Phase 1,
or hold it until the clinician signs off the rail?
