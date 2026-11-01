# Co-Motion

**Helping people with chronic musculoskeletal pain get through the months between appointments.**

A patient is seen in clinic and given an appointment six months out. In between, they flare.
They can't get in to see anyone. Many miss the appointment anyway and wait again.

The help they need already exists — spread across Arthritis Australia, the NSW ACI Pain
Network, painHEALTH, the Pain Toolkit, Painaustralia, healthdirect and half a dozen others.
It is effectively unfindable from inside a flare at 2am.

Co-Motion is the front door to that material. Ask a question in your own words, get an answer
drawn from those sources and *explained*, and get told what to do tonight.

---

## The design

### The rail

Every answer lands on exactly one of five rungs:

| | |
|---|---|
| **1** | You can do this at home |
| **2** | Your pharmacist can help today |
| **3** | This one's for your GP, and it can wait |
| **4** | Call your GP today |
| **5** | Get seen tonight |

Most questions should land on rungs 1–2. That is the objective, not a compromise: this person
*cannot* get an appointment, so routing them to a GP they can't see is a dead end dressed up as
caution, and it's how people end up in an emergency department.

### Two guarantees, enforced in code

A prompt is a request. Code is a guarantee. Both of these live in `server/index.js`, not in a
system prompt:

**1. The model can escalate. It can never soften.**
Two deterministic screens run *before* the model and set a floor — patterns over what the person
typed (`screen()`), and three questions we explicitly ask them (`triageScreen()`). The final
disposition is `max(floor, model)`.

If the floor is **ED, the model is never called at all.** The response is returned instantly.
That path cannot be delayed by a slow model on 4G, cannot be reworded or buried under lifestyle
advice, and cannot fail because an API key expired. **The most dangerous path in this product has
no language model anywhere in it, and works with zero configuration.**

**2. The model cannot invent health advice.**
It is handed the evidence cards and may only *select from them and explain them*. Every card ID
it returns is checked against the library; anything it invented is dropped. If nothing survives,
the answer is not shown as guidance — it's written into the patient's log as a question for their
doctor. The failure mode is "we don't know", never a confident fabrication.

### Why we ask three questions instead of just reading the text

The regex screen originally **missed** `"my toe is agony and I feel hot and shivery"` — a textbook
septic joint — because "shivery" wasn't on the word list. That is not a bug you fix by adding a
word. You cannot screen for danger by guessing which nouns a frightened person will reach for.

So the app asks, every time, before the model sees anything:

1. Is a joint hot, red or swollen — and you also feel feverish, shivery, or generally unwell?
2. Any new numbness around your groin, or trouble controlling your bladder or bowel?
3. Any new rash, blisters or ulcers in your mouth since starting a new medicine?

**"Not sure" counts as yes.** Someone in pain at 2am who isn't sure whether they have a fever
needs a nurse, not a language model. A false alarm costs a phone call; a miss costs a joint.

### The closed source allowlist

`server/evidence.js` is the whole product. 48 cards, each one traceable to a page we actually
retrieved, most carrying a verbatim quote and all carrying a link.

An earlier draft of that file was written from the model's own recall of NICE and ACR guidelines.
It read fluently and was mostly right — which is exactly what makes it dangerous, because nobody
can check it and "mostly right" is not a standard you hand to a patient. It was thrown away.

The library is a text file on purpose. A clinician can read it, argue with it, and correct it,
and correcting it is an edit — not a retrain.

**It caught a real error.** Painaustralia's factsheet (2016) tells patients to ask their GP for a
"GP Management Plan". Medicare retired that name on 1 July 2025 and replaced it with the **GP
Chronic Condition Management Plan**. A patient repeating the old term at a reception desk gets a
blank look. The card now uses the current name and cites the Department of Health directly. This
is what a curated library buys you that a model paraphrasing its training data does not.

### Design decisions worth defending

- **One typeface** — Atkinson Hyperlegible, designed by the Braille Institute for low-vision
  readers. The user is often 60, in pain, squinting at a dimmed phone. 20px base.
- **Two saturated colours, not five.** A five-hue severity ramp was the first instinct and it was
  wrong: deuteranopia runs ~8% in men, this audience skews male and 50+, and iOS Night Shift (on,
  at 2am) drags everything toward red. **Colour never carries urgency.** The verb does — largest
  text on screen — then the level ("5 of 5 — the highest"), then inversion. Colour only confirms.
- **No motion on the emergency state.** It paints in its final position. Animating "go to hospital"
  stages the cleverness of the rule engine at the worst moment of someone's night.
- **A human, one tap away.** Rung 5 is not an abstract instruction to go to an emergency
  department at 2am for what is probably gout. It is healthdirect — free, 24 hours, a nurse —
  as a `tel:` link, next to the sentence that breaks the patient's prior: *a gout flare and an
  infected joint look identical, and an infection can destroy the joint in a day or two.*

### The log

Questions the library can't answer don't evaporate. They're written down with the date and kept
in the browser. Six months of bad nights becomes a document the patient walks in holding, instead
of something they try to remember in a ten-minute appointment.

---

## Run it

```bash
npm install
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm start                 # → http://localhost:5070
```

The landing page is at `/`, the tool at `/app`.

**It runs without an API key.** You lose question-answering; you keep the library, the support
services, the log, and the entire red-flag rail including the emergency path. That is deliberate.

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | for `/api/ask` only | Question answering (claude-opus-4-8) |
| `ACCESS_CODE` | when deployed publicly | Gates `/api/ask`, the only endpoint that spends money. Unset = no gate (local dev). |
| `PORT` | no | Defaults to 5070. (Not 5060 — Chromium blocks it as the SIP port.) |

When deployed publicly, **set `ACCESS_CODE`**. Without it, anyone who finds the URL spends your
API budget. Everything except question-answering stays open to an unlocked visitor, so a fumbled
code can never dead-end a patient — or a demo.

---

## Layout

```
server/
  evidence.js   The library. 48 cards, closed source allowlist. No model. The whole product.
  redflags.js   The rail. Five rungs, the three triage questions, the pattern screen. No model.
  assistant.js  Claude as a librarian: selects cards and explains them. Cannot add a claim.
  index.js      Enforces the two guarantees. Short-circuits ED before the model.
public/
  index.html    Landing page.
  app.html      The tool.
```

## What this is not

Not a medical device. Not a diagnosis. Not a replacement for the GP, who owns the care plan —
this exists to support that plan between visits.

The library is curated from published sources but **has not yet been signed off by a GP or a
rheumatologist.** The architecture assumes that review happens. It does not substitute for it.
