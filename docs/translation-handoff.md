# Translation and clinical review handoff (Arabic, Vietnamese)

Source of truth: `public/locales/en.json`, plus the triage `catches`/`why` text that currently lives only in `server/redflags.js` (TRIAGE). Strings: Priority A 52, Priority B 64, Priority C 11.

## 1. Why this matters

Co-Motion helps people with arthritis, gout and back pain decide what to do between specialist appointments. A hard safety floor sits under the AI: certain symptoms always push the person to the highest urgency level, whatever the model says. Those messages are fixed strings and are never translated by a model at runtime. If "Get seen tonight" is translated as something softer, like "see someone soon", the safety floor is silently corrupted for every Arabic or Vietnamese speaker. That is why Priority A needs both a credentialed translator and a clinician.

Current state: `ar.json` and `vi.json` contain only chrome (`ui`, `conditions`, `interpreter`; 56 `ui` keys each), marked `verified: false`. That text is an **unreviewed machine draft**; please re-translate rather than polish it. Neither file has `rungs`, `triage` or `redflags`, so those currently show in English.

**Audience for every string:** people aged about 50 and over, often men, often in pain, frightened, reading at 2am. Plain register, around Year 6 reading level, short sentences. **Latin islands:** keep digits, phone numbers (000, 1800 022 222, 131 450), "healthdirect", "TIS National" and drug names such as allopurinol in Latin script unless there is an accepted local form (then add it in brackets after the Latin). Keep `{placeholders}` exactly as written.

## 2. Priority A: safety-critical (translator + clinician sign-off), 52 strings

| key | English source | where it appears | translator note | AR | VI | clinician-approved |
|---|---|---|---|---|---|---|
| `rungs.SELF_MANAGE.label` | You can do this at home | Result card, lowest urgency | Keep this level clearly distinct from the neighbouring levels: tonight / today / can wait / at home. | | | |
| `rungs.SELF_MANAGE.detail` | If it's worse tomorrow, or it hasn't settled in a few days, ring your GP. | Result card, lowest urgency | Keep phone numbers (1800 022 222, 000) as Latin digits and 'healthdirect' in Latin text. | | | |
| `rungs.PHARMACIST.label` | Your pharmacist can help with this today | Result card, same-day pharmacist | Keep this level clearly distinct from the neighbouring levels: tonight / today / can wait / at home. | | | |
| `rungs.PHARMACIST.detail` | No appointment. Talking to them costs nothing, and many are open late. | Result card, same-day pharmacist | Keep phone numbers (1800 022 222, 000) as Latin digits and 'healthdirect' in Latin text. | | | |
| `rungs.GP_NEXT.label` | This one's for your GP, and it can wait | Result card, can wait for next GP visit | Keep this level clearly distinct from the neighbouring levels: tonight / today / can wait / at home. | | | |
| `rungs.GP_NEXT.detail` | We've written it down for you — it's in your list below. Take it to your next visit. | Result card, can wait for next GP visit | Keep phone numbers (1800 022 222, 000) as Latin digits and 'healthdirect' in Latin text. | | | |
| `rungs.GP_NOW.label` | Call your GP today | Result card, call GP today | Keep this level clearly distinct from the neighbouring levels: tonight / today / can wait / at home. | | | |
| `rungs.GP_NOW.detail` | Call your practice and tell them it's a flare. If they can't fit you in, call healthdirect on 1800 022 222 — a nurse answers, any hour. | Result card, call GP today | Keep phone numbers (1800 022 222, 000) as Latin digits and 'healthdirect' in Latin text. | | | |
| `rungs.GP_NOW.callLabel` | Call healthdirect — a nurse, any hour | Button text next to the phone number | Short, imperative. Keep 'healthdirect' Latin. | | | |
| `rungs.ED.label` | Get seen tonight | Result card, highest urgency; also forced by the safety floor | Keep this level clearly distinct from the neighbouring levels: tonight / today / can wait / at home. | | | |
| `rungs.ED.detail` | Don't wait for a GP appointment. If you can't get to an emergency department, or you're not sure, call healthdirect now and a nurse will tell you what to do. If you are very unwell, call 000. | Result card, highest urgency; also forced by the safety floor | Keep phone numbers (1800 022 222, 000) as Latin digits and 'healthdirect' in Latin text. | | | |
| `rungs.ED.callLabel` | Call healthdirect now — free, 24 hours | Button text next to the phone number | Short, imperative. Keep 'healthdirect' Latin. | | | |
| `triage.t-septic.ask` | Is a joint hot, red or swollen — and you also feel feverish, shivery, or generally unwell? | Yes / Not sure / No question shown before any answer | Logic treats 'Not sure' as YES. Do not soften or shorten the symptom list. | | | |
| `triage.t-cauda.ask` | Any new numbness around your groin or between your legs, or trouble controlling your bladder or bowel? | Yes / Not sure / No question shown before any answer | Logic treats 'Not sure' as YES. Do not soften or shorten the symptom list. | | | |
| `triage.t-rash.ask` | Any new rash, blisters, or ulcers in your mouth since starting a new medicine? | Yes / Not sure / No question shown before any answer | Logic treats 'Not sure' as YES. Do not soften or shorten the symptom list. | | | |
| `triage.t-gca.ask` | Are you over 50 with a new headache at your temple or scalp, aching in your jaw when you chew, or any change to your vision? | Yes / Not sure / No question shown before any answer | Logic treats 'Not sure' as YES. Do not soften or shorten the symptom list. | | | |
| `triage.t-septic.catches` | A hot joint together with feeling feverish or unwell | Short label for why the safety floor fired (SOURCE: server/redflags.js TRIAGE; needs a locale key) | One plain line. | | | |
| `triage.t-septic.why` | An infected joint looks exactly like a gout or arthritis flare — hot, red, swollen, agonising. The difference is that an infection can destroy the joint in a day or two, and the only way to tell them apart is to test the fluid in the joint. If you have had thirty flares and this feels like the thirty-first, that is precisely when this gets missed. | Explanation shown when this question fires (SOURCE: server/redflags.js TRIAGE; needs a locale key) | Keep urgency. Drug name 'allopurinol' stays Latin. | | | |
| `triage.t-cauda.catches` | Numbness in the saddle area, or loss of bladder or bowel control | Short label for why the safety floor fired (SOURCE: server/redflags.js TRIAGE; needs a locale key) | One plain line. | | | |
| `triage.t-cauda.why` | These are signs that the nerves at the base of the spine are being squeezed. It is one of the very few emergencies in back pain, and the damage becomes permanent within hours. Everything else about back pain can wait. This cannot. | Explanation shown when this question fires (SOURCE: server/redflags.js TRIAGE; needs a locale key) | Keep urgency. Drug name 'allopurinol' stays Latin. | | | |
| `triage.t-rash.catches` | A new rash or mouth ulcers after starting a new medicine | Short label for why the safety floor fired (SOURCE: server/redflags.js TRIAGE; needs a locale key) | One plain line. | | | |
| `triage.t-rash.why` | Some medicines — allopurinol among them — can rarely trigger a severe reaction that starts in the skin. Caught early it is treatable. Left for a few days it can kill you. Arthritis Australia's own advice is to contact a doctor straight away. | Explanation shown when this question fires (SOURCE: server/redflags.js TRIAGE; needs a locale key) | Keep urgency. Drug name 'allopurinol' stays Latin. | | | |
| `triage.t-gca.catches` | New temple headache, jaw pain on chewing, or a change to vision in someone over 50 | Short label for why the safety floor fired (SOURCE: server/redflags.js TRIAGE; needs a locale key) | One plain line. | | | |
| `triage.t-gca.why` | Together these can be giant cell arteritis — inflamed arteries at the temple — which can cause sudden, permanent loss of vision within days if it is not treated quickly. A change to your vision especially cannot wait. | Explanation shown when this question fires (SOURCE: server/redflags.js TRIAGE; needs a locale key) | Keep urgency. Drug name 'allopurinol' stays Latin. | | | |
| `ui.triage.heading` | Four quick questions first | Triage panel |  | | | |
| `ui.triage.intro` | A few things look exactly like a flare but aren't. This takes ten seconds and it's the part we don't leave to a computer's judgement. If you're not sure, say so — that's a real answer. | Triage panel | Says 'not sure' is a real answer: preserve that. | | | |
| `ui.triage.continue` | Continue | Triage panel |  | | | |
| `ui.triage.checking` | Checking… | Triage panel |  | | | |
| `ui.opt.yes` | Yes | Triage answer buttons |  | | | |
| `ui.opt.unsure` | Not sure | Triage answer buttons | Must read as a legitimate third option, not 'I don't know the answer'. | | | |
| `ui.opt.no` | No | Triage answer buttons |  | | | |
| `ui.concern.question` | I'm worried something might be wrong right now. | Free-text path: user states a worry |  | | | |
| `ui.ask.concern` | Something feels wrong right now → | Link under the question box |  | | | |
| `ui.siren.title` | Some things can't wait for this page. | Permanent emergency banner at top of page (siren.body is followed by a phone number rendered by the app) |  | | | |
| `ui.siren.body` | Chest pain, trouble breathing, or a limb you can't move — go to an emergency department now. Not sure? Call healthdirect free, any hour, on | Permanent emergency banner at top of page (siren.body is followed by a phone number rendered by the app) | Keep 'healthdirect' Latin. Sentence ends 'on' because the number follows; reorder only if the number still follows directly. | | | |
| `ui.sec.emergency` | Go to an emergency department if any of this is happening | Heading above the red-flag list |  | | | |
| `ui.answer.raised` | Raised from “{modelSaid}” because of what you told us above. This can't be lowered. | Shown when the safety floor overrides the model's lower level. {modelSaid} is a placeholder | Keep {modelSaid} and quote marks intact. 'This can't be lowered' is deliberate. | | | |
| `redflags.septic-joint.catches` | A hot, swollen joint together with fever or feeling generally unwell | Red-flag list heading and result card |  | | | |
| `redflags.septic-joint.why` | An infected joint (septic arthritis) looks almost exactly like a gout or arthritis flare — hot, red, swollen, agonising. The difference is that an infected joint destroys itself within days and can make you dangerously unwell. It cannot be told apart from a flare without testing the fluid in the joint. | Red-flag explanation | Drug names stay Latin; medical terms in brackets after a local term if helpful. | | | |
| `redflags.cauda-equina.catches` | Back pain with numbness in the saddle area, or loss of bladder or bowel control, or new weakness in both legs | Red-flag list heading and result card |  | | | |
| `redflags.cauda-equina.why` | These are signs the nerves at the base of the spine are being compressed. It is one of the few genuine emergencies in back pain, and the damage becomes permanent within hours. Everything else about back pain can wait. This cannot. | Red-flag explanation | Drug names stay Latin; medical terms in brackets after a local term if helpful. | | | |
| `redflags.allopurinol-rash.catches` | A new rash, blisters or mouth ulcers after starting allopurinol | Red-flag list heading and result card |  | | | |
| `redflags.allopurinol-rash.why` | Allopurinol can rarely trigger a severe allergic skin reaction. Caught early it is survivable; ignored for a few days it can be fatal. Any new rash after starting allopurinol is treated as that reaction until proven otherwise — stop the drug and be seen the same day. | Red-flag explanation | Drug names stay Latin; medical terms in brackets after a local term if helpful. | | | |
| `redflags.gi-bleed.catches` | Black or tarry stools, or vomiting blood, while taking anti-inflammatories | Red-flag list heading and result card |  | | | |
| `redflags.gi-bleed.why` | Anti-inflammatories can cause bleeding in the stomach. Black tarry stools or vomit that looks like coffee grounds mean it is already bleeding. This is an emergency regardless of how well you otherwise feel. | Red-flag explanation | Drug names stay Latin; medical terms in brackets after a local term if helpful. | | | |
| `redflags.chest-breathing.catches` | Chest pain or difficulty breathing | Red-flag list heading and result card |  | | | |
| `redflags.chest-breathing.why` | Neither belongs to your musculoskeletal condition and both can be immediately life-threatening. This is not something to work out at home. | Red-flag explanation | Drug names stay Latin; medical terms in brackets after a local term if helpful. | | | |
| `redflags.trauma.catches` | Unable to put weight on it after a fall or injury, or the joint looks deformed | Red-flag list heading and result card |  | | | |
| `redflags.trauma.why` | That pattern suggests a fracture or dislocation rather than a flare, and it needs an X-ray. | Red-flag explanation | Drug names stay Latin; medical terms in brackets after a local term if helpful. | | | |
| `redflags.giant-cell-arteritis.catches` | A new headache at the temple, jaw ache when chewing, scalp tenderness, or any change to vision — especially over 50 | Red-flag list heading and result card |  | | | |
| `redflags.giant-cell-arteritis.why` | In people over 50 these can be giant cell arteritis — inflammation of the arteries at the temple. Untreated it can cause sudden and permanent loss of vision within days, so it is treated as an emergency. A change to your vision in particular cannot wait. | Red-flag explanation (NEW, unreviewed) | Drug names stay Latin; medical terms in brackets after a local term if helpful. | | | |
| `interpreter.script` | I need an interpreter. I speak [your language]. | Phone script the user reads aloud to a GP, pharmacist or healthdirect | Shown in English for the receptionist alongside the translation. [your language] is a fill-in slot; keep the brackets. | | | |

## 3. Priority B: UI chrome and answer-section strings (translator only), 64 strings

| key | English source | where it appears / note | AR | VI |
|---|---|---|---|---|
| `ui.subtitle.strong` | Your appointment is months away. This can't move it — but it can tell you what to do tonight. |  | | |
| `ui.subtitle.rest` | Ask about a flare, a medicine, a bad night. You'll get an answer from Australian health services, and a plan. |  | | |
| `ui.gate.title` | Access code |  | | |
| `ui.gate.body` | Asking a question needs a code. Everything else on this page works without one. |  | | |
| `ui.gate.placeholder` | Code |  | | |
| `ui.gate.unlock` | Unlock |  | | |
| `ui.gate.error` | That code didn't work. |  | | |
| `ui.ask.placeholder` | “My toe is on fire and I've run out of tablets — what do I do tonight?” |  | | |
| `ui.ask.button` | Ask |  | | |
| `ui.ask.label` | Your question |  | | |
| `ui.ask.spinner` | Looking through the library… |  | | |
| `ui.ask.about` | This is about: |  | | |
| `ui.ask.error` | Something went wrong. |  | | |
| `ui.ask.neterror` | Couldn't reach the server. Check your connection and try again. |  | | |
| `ui.browse.heading` | Or look around |  | | |
| `ui.home.welcome` | What are you looking for today? |  | | |
| `ui.home.ask` | Or ask a question |  | | |
| `ui.browse.all` | All |  | | |
| `ui.browse.resources` | {n} resources | Has placeholders {...}: keep verbatim | | |
| `ui.browse.inLang` | {n} in {lang} | Has placeholders {...}: keep verbatim | | |
| `ui.browse.translated` | {n} with translated versions | Has placeholders {...}: keep verbatim | | |
| `ui.langnote.available` | {n} resources are available in {lang} — they'll show first when you open a topic. | Has placeholders {...}: keep verbatim | | |
| `ui.langnote.none` | We don't have resources tagged specifically in {lang} yet. {n} have translated or culturally-adapted versions, and free interpreter help (TIS National, 131 450) is offered on every topic. | Has placeholders {...}: keep verbatim | | |
| `ui.dir.back` | ← All topics |  | | |
| `ui.dir.open` | Open this resource → |  | | |
| `ui.dir.downloads` | Downloads: |  | | |
| `ui.dir.file` | file {n} | Has placeholders {...}: keep verbatim | | |
| `ui.dir.empty` | Nothing here yet. |  | | |
| `ui.dir.inLangSuffix` |  — in {lang} | Has placeholders {...}: keep verbatim | | |
| `ui.dir.someInLang` | {n} of these are available in {lang} — shown first. | Has placeholders {...}: keep verbatim | | |
| `ui.badge.inLang` | In {lang} | Has placeholders {...}: keep verbatim | | |
| `ui.badge.translated` | Translated versions |  | | |
| `ui.answer.level` | Level {level} | Has placeholders {...}: keep verbatim | | |
| `ui.answer.noAnswer.title` | We don't have a sourced answer for that one. |  | | |
| `ui.answer.noAnswer.body` | {reason} We'd rather say that than guess{where}. It's gone in your log with today's date, so you can put it to the doctor. | Has placeholders {...}: keep verbatim | | |
| `ui.answer.noAnswer.default` | Nothing in our sources covers this. |  | | |
| `ui.answer.noAnswer.where` |  — but here's where to look |  | | |
| `ui.answer.whereToLook` | Where to go next |  | | |
| `ui.answer.found` | What we found |  | | |
| `ui.answer.related` | Related topics |  | | |
| `ui.answer.trusted` | Trusted resources — what you can do next |  | | |
| `ui.action.read` | Read |  | | |
| `ui.action.watch` | Watch |  | | |
| `ui.action.contact` | Contact or join |  | | |
| `ui.action.discuss` | Discuss with a health professional |  | | |
| `ui.sec.plan` | The thing to ask your GP for |  | | |
| `ui.sec.log` | Your log |  | | |
| `ui.log.empty` | Nothing here yet. Every question we can't answer gets written down for you, with the date — so six months of bad nights turns into something you can hand to the doctor, instead of trying to remember it in a ten-minute appointment. |  | | |
| `ui.log.print` | Print this |  | | |
| `ui.log.takeIt` | Take it to your appointment. |  | | |
| `ui.sec.today` | Things you can do today, without an appointment |  | | |
| `ui.sec.browseAll` | Browse everything |  | | |
| `ui.plan.say` | Say this |  | | |
| `ui.card.misconception` | Common misconception |  | | |
| `ui.unverified` | This {lang} translation is a machine draft still being checked by a human translator. If anything is unclear, the English is the source of truth — and you can call the free interpreter line on 131 450. | Has placeholders {...}: keep verbatim | | |
| `interpreter.title` | Ask for a free interpreter | Interpreter panel | | |
| `interpreter.body` | When you call a GP, a pharmacist or healthdirect, you can ask for an interpreter at no cost. | Interpreter panel | | |
| `interpreter.sayLabel` | Say this on the phone | Interpreter panel | | |
| `interpreter.note` | Or call TIS National yourself, free, and ask them to connect you — | Interpreter panel | | |
| `conditions.gout` | Gout | Condition picker | | |
| `conditions.osteoarthritis` | Osteoarthritis | Condition picker | | |
| `conditions.back_pain` | Back pain | Condition picker | | |
| `conditions.ra` | Rheumatoid arthritis | Condition picker | | |
| `conditions.other` | Other musculoskeletal pain | Condition picker | | |

## 4. Priority C: example prompts (translator only), 11 strings

Tap-to-ask suggestions. Translate as a natural question a person would ask; no need to be literal.

| key | English source | where it appears / note | AR | VI |
|---|---|---|---|---|
| `examples.gout[0]` | Can I still have a beer? | Tap-to-ask prompt, gout | | |
| `examples.gout[1]` | Should I stop my allopurinol while it's flaring? | Tap-to-ask prompt, gout | | |
| `examples.gout[2]` | Do cherries actually help? | Tap-to-ask prompt, gout | | |
| `examples.osteoarthritis[0]` | Is walking on it making it worse? | Tap-to-ask prompt, osteoarthritis | | |
| `examples.osteoarthritis[1]` | Do I need a scan? | Tap-to-ask prompt, osteoarthritis | | |
| `examples.osteoarthritis[2]` | Are glucosamine tablets worth it? | Tap-to-ask prompt, osteoarthritis | | |
| `examples.back_pain[0]` | Should I rest it? | Tap-to-ask prompt, back_pain | | |
| `examples.back_pain[1]` | Can I get physio subsidised? | Tap-to-ask prompt, back_pain | | |
| `examples.ra[0]` | Can I exercise with it? | Tap-to-ask prompt, ra | | |
| `examples.other[0]` | I keep flaring every time I have a good day | Tap-to-ask prompt, other | | |
| `examples.other[1]` | What can I do while I wait? | Tap-to-ask prompt, other | | |

## 5. Reviewer checklist

- [ ] **Back-translation spot check of Priority A.** An independent bilingual person translates Priority A rows back to English without seeing the source; a clinician compares with the original. Cover all rung labels, triage questions and red-flag "why" texts if budget allows, at minimum a sample weighted to ED and GP_NOW.
- [ ] **Urgency verbs survive.** "Get seen", "Call", "go to", "don't wait", "stop the drug" remain commands, not suggestions.
- [ ] **Tonight / today / can wait stay distinct.** "Get seen tonight" (ED), "Call your GP today", "Your pharmacist can help with this today", "it can wait", "at home" must not read the same.
- [ ] **"Not sure" reads as a legitimate answer** in all 4 triage questions (the logic treats it as YES).
- [ ] **Symptom lists not softened or shortened:** saddle numbness, bladder or bowel control, vision change, black stools.
- [ ] **Numbers intact:** 000, 1800 022 222, 131 450 are Latin digits and correct.
- [ ] **Arabic RTL rendering:** Latin islands (numbers, healthdirect, allopurinol) sit correctly inside RTL sentences; the phone number after "on" in `ui.siren.body` does not flip. Check on a phone in the app, not only in this sheet.
- [ ] **Vietnamese diacritics** render and nothing truncates on buttons.
- [ ] **Placeholders** ({n}, {lang}, {modelSaid}, {level}) unchanged.

**How to return the work:** fill the AR and VI columns (and initials plus date in "clinician-approved" for Priority A rows). Do not edit the English. Viren will convert the sheet to locale JSON and set `verified: true` only after Priority A sign-off.

## 6. Open clinical questions

1. **No named clinical sign-off yet** on the rung wording (five labels and details) or the 4 triage questions. The English needs GP or rheumatologist approval before translation is treated as final.
2. **Giant cell arteritis screen (t-gca and the red flag) is new and unreviewed.** Open points: is "over 50" the right threshold, is the symptom list right (not too broad or narrow), and is the ED floor ("get seen tonight") correct for all presentations or should some be same-day?
3. **"Not sure counts as yes"** is a deliberate over-triage; the clinician should confirm they accept the false-alarm rate across all 4 questions.
4. **Allopurinol rash:** the red-flag text says "stop the drug and be seen the same day". Confirm this is appropriate advice to give without a clinician.
5. The triage `catches`/`why` text exists only in code and differs from the `redflags.*` wording in en.json. Settle the final English first so translators do not work on text that is about to change.
