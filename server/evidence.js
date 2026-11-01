// THE EVIDENCE LIBRARY — and where every word of it comes from.
//
// Co-Motion never lets the model write health advice. It may only SELECT cards from
// this file and write a sentence of connective tissue around them. An answer that
// cites no card is not shown as guidance — it is parked on the "take this to your GP"
// list instead. That is enforced in index.js, server-side, not by asking the model
// politely in a prompt.
//
// THE SOURCE ALLOWLIST IS CLOSED. Every card below is grounded in one of the endorsed
// Australian consumer sources in SOURCES, and nothing else is admissible — not
// clinician guidelines, not the model's own knowledge, not a study it half-remembers.
// If a claim isn't in a source in that list, it doesn't go in the library.
//
// This matters more than it looks. An earlier draft of this file was written from the
// model's own recall of NICE and ACR guidance. It read fluently and it was mostly
// right, which is exactly what makes it dangerous: nobody can check it, and "mostly
// right" is not a standard you can hand to a patient. Every card here was retrieved
// from the page it cites, and carries the URL so a clinician — or the patient — can
// go and read the original.
//
// The content is UNIVERSAL. There is no personalisation, no profile, no tailoring to
// the individual. Everyone with gout sees the same gout cards. That is a deliberate
// design constraint, and it is what makes clinical sign-off tractable: a GP reviews
// this file once, and what they signed off is what every patient gets.
//
// Nothing in this file calls a model. It must keep working with no API key.

export const SOURCES = {
  arthritis_au: {
    name: "Arthritis Australia",
    url: "https://arthritisaustralia.org.au/understanding-arthritis/",
    phone: "1800 011 041",
    note: "National consumer body for arthritis. Condition information, treatment sheets, and state arthritis offices.",
  },
  mha: {
    name: "Musculoskeletal Health Australia",
    url: "https://muscha.org/",
    phone: "1800 263 265",
    note: "Consumer body for arthritis, back pain, gout, osteoporosis and 150+ MSK conditions. Free national help line, peer support groups, chair-based exercise.",
  },
  aci: {
    name: "ACI Pain Management Network (NSW Agency for Clinical Innovation)",
    url: "https://aci.health.nsw.gov.au/chronic-pain",
    note: "NSW Health's own chronic pain resource. Interactive self-management tools covering psychological therapies, sleep, diet and exercise, plus a youth channel and the NSW pain service pathways.",
  },
  painhealth: {
    name: "painHEALTH",
    url: "https://painhealth.com.au",
    note: "Clinically supported self-management information for musculoskeletal pain.",
  },
  chronic_pain_au: {
    name: "Chronic Pain Australia",
    url: "https://chronicpainaustralia.org.au/resources/",
    phone: "1300 340 357",
    note: "Peer support, community forum, and the APMA Pain Link help line.",
  },
  active_healthy: {
    name: "Active and Healthy (NSW Health)",
    url: "https://www.activeandhealthy.nsw.gov.au/",
    note: "Finds local and virtual exercise programs by suburb. Aimed at older adults.",
  },
  get_healthy: {
    name: "Get Healthy Service (NSW Health)",
    url: "https://www.nsw.gov.au/health-and-wellbeing/healthy-living/gethealthyservice",
    phone: "1300 806 258",
    note: "Free NSW phone and online health coaching — nutrition, activity, weight, alcohol.",
  },
  pain_toolkit: {
    name: "Pain Toolkit",
    url: "https://www.paintoolkit.org/",
    note: "The twelve tools for pain self-management.",
  },
  painaustralia: {
    name: "Painaustralia — Self-managing chronic pain (factsheet 10)",
    url: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
    note: "National pain body. The self-management factsheet — pacing, relaxation, sleep, CBT, and the Medicare-funded GP Management Plan.",
  },
  healthdirect: {
    name: "healthdirect",
    url: "https://www.healthdirect.gov.au/",
    phone: "1800 022 222",
    note: "Government-funded health information and 24-hour advice line.",
  },
  tga_cmi: {
    name: "TGA — Consumer Medicines Information",
    url: "https://www.tga.gov.au/resources/consumer-information-and-resources/medicines-safety-and-general-information-consumers/find-information-about-medicine",
    note: "Look up the official consumer information leaflet for any medicine you are taking.",
    notExtracted: true,
  },
  rare_voices: {
    name: "Rare Voices Australia — Rare Disease Disability Toolkit",
    url: "https://rarevoices.org.au/rare-disease-disability-project/rare-disease-disability-toolkit/",
    note: "For people whose MSK condition is rare and doesn't fit the usual pathways.",
    notExtracted: true,
  },
  health_gov: {
    name: "Department of Health — MBS Chronic Disease Management",
    url: "https://www.health.gov.au/our-work/upcoming-changes-to-mbs-chronic-disease-management-arrangements",
    note: "The primary source for what a GP chronic condition management plan is and what it pays for, since the 1 July 2025 changes.",
  },
};

// Honesty about the build, shown in the UI rather than buried here.
export const PROVENANCE = {
  headline: "Every card in Co-Motion comes from one of these Australian sources. Nothing else is admissible.",
  caveat:
    "Prototype. Cards were retrieved from the pages they cite, but have not yet been signed off by a GP or rheumatologist. Co-Motion supports the plan your GP gave you — it does not replace it.",
  notExtractedNote:
    "One source is linked but not mined for cards: the TGA medicines lookup, which is a search tool rather than a page of advice. It is surfaced as a link, because paraphrasing a page we have not actually read is the exact failure this library exists to prevent.",
};

export const DOMAINS = {
  medication: { label: "Medication", blurb: "What you take, and what not to stop" },
  activity: { label: "Movement & exercise", blurb: "During a flare, and between them" },
  nutrition: { label: "Food & drink", blurb: "What actually moves the needle" },
  weight: { label: "Weight", blurb: "Only where the evidence supports it" },
  psychological: { label: "Mood & coping", blurb: "Pain and mood pull on each other" },
  selfmanagement: { label: "Managing it yourself", blurb: "Pacing, flare plans, knowing your numbers" },
};

export const CONDITIONS = {
  gout: {
    label: "Gout",
    blurb: "Highly treatable. The single biggest reason it goes badly is people stopping the preventer.",
    curated: true,
  },
  osteoarthritis: {
    label: "Osteoarthritis",
    blurb: "The most common joint condition. Exercise is not an optional extra — it is the treatment.",
    curated: true,
  },
  back_pain: {
    label: "Back pain",
    blurb: "General MSK pain self-management applies. Condition-specific cards not yet curated.",
    curated: false,
  },
  ra: {
    label: "Rheumatoid arthritis",
    blurb: "General MSK pain self-management applies. Condition-specific cards not yet curated.",
    curated: false,
  },
  other: {
    label: "Other musculoskeletal pain",
    blurb: "The universal self-management library, which applies across MSK conditions.",
    curated: false,
  },
};

// condition: "*" means the card is universal — it applies to every MSK condition.
// Most of the library is universal, which is the point: chronic MSK pain
// self-management is largely the same job whatever the diagnosis.
//
// `quote` is text actually present on the cited page. `myth` marks a belief that is
// common and wrong — the highest-value cards, because the patient is usually already
// acting on the myth.
export const EVIDENCE = [
  // ================================================== GOUT — Arthritis Australia
  {
    id: "gout-dont-stop-allopurinol",
    condition: "gout",
    domain: "medication",
    priority: 1,
    myth: true,
    title: "Do not stop your allopurinol during an attack",
    plain:
      "Allopurinol is a preventer, not a painkiller — so it will not settle the attack you are having, and that is not a reason to stop it. Keep taking it right through the attack, and treat the pain with the separate medicine your doctor has recommended for that.",
    quote:
      "Allopurinol is not a pain reliever. You should continue to take allopurinol during an attack, but your doctor will also recommend medicines to treat pain and inflammation.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/living-with-arthritis/treatment-and-care/allopurinol/",
  },
  {
    id: "gout-flares-when-starting",
    condition: "gout",
    domain: "medication",
    priority: 1,
    myth: true,
    title: "Attacks in the first weeks don't mean it isn't working",
    plain:
      "Starting allopurinol — or going up a dose — can itself set off an attack. This catches people out and it is the moment many give up on the medicine. It does not mean the drug is wrong or failing. Your doctor may prescribe colchicine or an anti-inflammatory alongside it to reduce that risk; if you haven't been offered one, that is worth asking about.",
    quote:
      "Starting allopurinol or increasing the dose can actually cause an attack of gout. However, this does not mean the medicine is not working, so keep taking it… To reduce the risk of a gout attack, medicines such as colchicine or anti-inflammatory drugs may be recommended before or at the same time allopurinol is started.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/living-with-arthritis/treatment-and-care/allopurinol/",
  },
  {
    id: "gout-stopping-recurs",
    condition: "gout",
    domain: "medication",
    priority: 1,
    title: "If you stop, the gout comes back",
    plain:
      "Allopurinol works for as long as you take it. Stopping carries a high risk that the gout returns — so do not stop unless your doctor tells you to, or unless side effects develop.",
    quote:
      "If you stop allopurinol treatment there is a high risk that your gout may recur. It is very important not to stop your treatment unless advised by your doctor or unless side effects develop.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/living-with-arthritis/treatment-and-care/allopurinol/",
  },
  {
    id: "gout-blood-tests",
    condition: "gout",
    domain: "selfmanagement",
    priority: 2,
    title: "The dose is set by a blood test, not by how you feel",
    plain:
      "Your uric acid level is checked by blood test to make sure the medicine is actually working, and your liver function is checked early on. Feeling fine is not proof the dose is right. Ask your GP when your next uric acid test is due — seeing them regularly is part of the treatment, not an optional extra.",
    quote:
      "The uric acid level in your blood will be checked to make sure the medicine is working. It is important to see your general practitioner (GP) regularly as they have an important role in monitoring your condition.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/living-with-arthritis/treatment-and-care/allopurinol/",
  },
  {
    id: "gout-takes-weeks",
    condition: "gout",
    domain: "medication",
    priority: 2,
    title: "It takes weeks to work — and the dose builds up slowly",
    plain:
      "Allopurinol is started at a small dose and increased. It can take several weeks to bring the uric acid down, and you may keep having attacks during that time. This is expected. Stick with it.",
    quote:
      "It may take several weeks to reduce the level of uric acid so you may continue to have gout attacks for some time.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/living-with-arthritis/treatment-and-care/allopurinol/",
  },
  {
    id: "gout-alcohol",
    condition: "gout",
    domain: "nutrition",
    priority: 1,
    title: "Alcohol triggers attacks — the advice is 1 to 2 standard drinks a week",
    plain:
      "Alcohol is a direct trigger for gout attacks. Arthritis Australia's advice for people taking allopurinol is to limit alcohol to one or two standard drinks per week — which is a good deal less than most people assume. If cutting down is hard, the free NSW Get Healthy Service coaches specifically on reducing alcohol.",
    quote: "Limit alcohol to 1-2 standard drinks weekly, as it triggers attacks.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/living-with-arthritis/treatment-and-care/allopurinol/",
    seeAlso: ["get_healthy"],
  },
  {
    id: "gout-rash-urgent",
    condition: "gout",
    domain: "medication",
    priority: 1,
    title: "A severe rash or mouth ulcers on allopurinol — contact your doctor straight away",
    plain:
      "Nausea is a common and minor side effect. But serious skin reactions are a rare and dangerous one. If you develop a severe rash or ulcers in your mouth after starting allopurinol, do not wait and see — contact a doctor straight away.",
    quote: "Contact your doctor straight away if severe rashes or mouth ulceration develop.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/living-with-arthritis/treatment-and-care/allopurinol/",
  },
  {
    id: "gout-drug-interaction",
    condition: "gout",
    domain: "medication",
    priority: 2,
    title: "Tell any new doctor you are on allopurinol",
    plain:
      "Allopurinol combined with azathioprine or mercaptopurine is described as very dangerous. Any doctor prescribing you something new needs to know you are taking it. If you want to check what a medicine of yours does and what it interacts with, the TGA publishes the official consumer leaflet for every medicine sold in Australia.",
    quote: "Avoid combining with azathioprine or mercaptopurine—interaction is 'very dangerous'.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/living-with-arthritis/treatment-and-care/allopurinol/",
    seeAlso: ["tga_cmi"],
  },

  // ================================================== OSTEOARTHRITIS — Arthritis Australia
  {
    id: "oa-exercise",
    condition: "osteoarthritis",
    domain: "activity",
    priority: 1,
    title: "Exercise is strongly recommended — it is the treatment",
    plain:
      "Exercise keeps your joints and muscles healthy and flexible, and prevents other health problems on top. A physiotherapist or exercise physiologist can tell you what to do and how much. If you are in NSW and want to find something local, the Active and Healthy program finder searches classes by suburb.",
    quote:
      "Exercise is strongly recommended for people with OA. It keeps your joints and muscles healthy and flexible and prevents other health problems.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/understanding-arthritis/types-of-arthritis/find-your-arthritis/osteoarthritis/",
    seeAlso: ["active_healthy", "mha"],
  },
  {
    id: "oa-weight",
    condition: "osteoarthritis",
    domain: "weight",
    priority: 1,
    title: "If you are overweight, weight loss is part of the treatment",
    plain:
      "Being overweight increases the risk of osteoarthritis in the knees, hips and hands, and a weight loss program is part of standard treatment if it applies to you. The Get Healthy Service gives NSW residents up to 10 free coaching calls to work on exactly this.",
    quote: "Treatment typically includes a weight loss program, if you are overweight.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/understanding-arthritis/types-of-arthritis/find-your-arthritis/osteoarthritis/",
    seeAlso: ["get_healthy"],
  },
  {
    id: "oa-no-diet-cure",
    condition: "osteoarthritis",
    domain: "nutrition",
    priority: 2,
    myth: true,
    title: "No diet cures osteoarthritis",
    plain:
      "There is no diet that cures OA. Healthy eating matters here because it gets you to a healthy body weight — not because any particular food or supplement treats the joint. Be sceptical of anything sold on that promise.",
    quote:
      "There is no diet that will cure OA, but healthy eating and a diet aimed at maintaining an ideal body weight is recommended.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/understanding-arthritis/types-of-arthritis/find-your-arthritis/osteoarthritis/",
  },
  {
    id: "oa-cure-claims",
    condition: "osteoarthritis",
    domain: "selfmanagement",
    priority: 2,
    myth: true,
    title: "Be wary of anything claiming to cure it",
    plain:
      "There is currently no cure for osteoarthritis, which makes it a magnet for products and therapies that claim otherwise. Arthritis Australia's advice is to be wary of them. Money spent on those is money not spent on the exercise program that does work.",
    quote:
      "You should be wary of products or therapies that claim to cure OA. Currently, there is no cure for OA.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/understanding-arthritis/types-of-arthritis/find-your-arthritis/osteoarthritis/",
  },
  {
    id: "oa-medication",
    condition: "osteoarthritis",
    domain: "medication",
    priority: 2,
    title: "Pain relief, plus changing how you respond to pain",
    plain:
      "Paracetamol or anti-inflammatories are used for pain control — but note that Arthritis Australia pairs medication with learning to change the way you think about and react to pain. The second half is not a consolation prize; it is listed as part of the treatment.",
    quote:
      "Pain control uses medicines such as paracetamol or non-steroidal anti-inflammatory drugs (NSAIDs), combined with learning to change the way you think about, and react to, pain.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/understanding-arthritis/types-of-arthritis/find-your-arthritis/osteoarthritis/",
    seeAlso: ["painhealth"],
  },
  {
    id: "oa-devices-surgery",
    condition: "osteoarthritis",
    domain: "selfmanagement",
    priority: 3,
    title: "Braces, sticks and insoles — and surgery only when other things stop working",
    plain:
      "Braces, walking sticks and shoe insoles are part of the treatment toolkit and are worth asking about. Joint replacement surgery becomes an option if your symptoms are no longer controlled by other therapies — that is the sequence, and it is worth knowing where you are in it.",
    quote:
      "Treatment incorporates devices such as braces, walking sticks, and shoe insoles… Joint replacement surgery becomes an option if your symptoms are no longer controlled with other therapies.",
    source: "arthritis_au",
    sourceUrl: "https://arthritisaustralia.org.au/understanding-arthritis/types-of-arthritis/find-your-arthritis/osteoarthritis/",
  },

  // ================================================== UNIVERSAL — medication (healthdirect)
  {
    id: "med-opioids-chronic",
    condition: "*",
    domain: "medication",
    priority: 1,
    myth: true,
    title: "Opioids are not shown to help long-term pain",
    plain:
      "healthdirect is blunt about this: there is no clear evidence that opioids help chronic non-cancer pain. They can be addictive, they can cause life-threatening breathing problems, and the risk grows the longer you take them — so they are best used for the shortest time possible. If you are on them long-term for MSK pain, that is a conversation to have with your GP. It is not a reason to stop them suddenly on your own.",
    quote:
      "There is no clear evidence that opioids are helpful for chronic non-cancer pain… best to use them for the shortest time possible.",
    source: "healthdirect",
    sourceUrl: "https://www.healthdirect.gov.au/pain-relief-medicines",
  },
  {
    id: "med-dont-stop-suddenly",
    condition: "*",
    domain: "medication",
    priority: 1,
    title: "Don't stop prescription pain medicine suddenly",
    plain:
      "Whatever you have decided about a medicine, stopping it abruptly can cause problems of its own. Changes get made with your GP, not in the kitchen at 11pm.",
    quote: "Don't stop prescription pain relief suddenly.",
    source: "healthdirect",
    sourceUrl: "https://www.healthdirect.gov.au/pain-relief-medicines",
  },
  {
    id: "med-nsaids-not-for-everyone",
    condition: "*",
    domain: "medication",
    priority: 1,
    title: "Anti-inflammatories are not safe for everyone",
    plain:
      "Ibuprofen, aspirin and diclofenac are sold over the counter, which makes them feel harmless. They are not suitable for people with stomach problems, liver problems, high blood pressure or asthma. Over-the-counter does not mean risk-free — a pharmacist can tell you in two minutes whether these are safe for you, free and without an appointment.",
    quote:
      "OTC medicines are easier to get than prescription ones, but they still carry risks… NSAIDs unsuitable for people with stomach problems, liver problems, high blood pressure (hypertension), asthma.",
    source: "healthdirect",
    sourceUrl: "https://www.healthdirect.gov.au/pain-relief-medicines",
  },
  {
    id: "med-paracetamol-first",
    condition: "*",
    domain: "medication",
    priority: 2,
    title: "Paracetamol is usually the first thing to try for short-term pain",
    plain:
      "For short-term pain, paracetamol is often the first medicine recommended. Also worth knowing: never take someone else's medicine, and never give them yours — including the anti-inflammatory that worked so well for your knee.",
    quote:
      "Paracetamol is often recommended as the first medicine to try for short-term pain… Never share your medicines with other people or take another person's medicine.",
    source: "healthdirect",
    sourceUrl: "https://www.healthdirect.gov.au/pain-relief-medicines",
  },
  {
    id: "med-look-it-up",
    condition: "*",
    domain: "medication",
    priority: 3,
    title: "You can look up the official leaflet for any medicine you take",
    plain:
      "Every medicine sold in Australia has a Consumer Medicines Information leaflet — what it is, what it does, side effects, interactions — published by the TGA. If you want to know what you are actually taking, this is the authoritative place, not a forum.",
    source: "tga_cmi",
    sourceUrl: "https://www.tga.gov.au/resources/consumer-information-and-resources/medicines-safety-and-general-information-consumers/find-information-about-medicine",
  },

  // ================================================== UNIVERSAL — self-management (Pain Toolkit)
  {
    id: "pt-pacing",
    condition: "*",
    domain: "selfmanagement",
    priority: 1,
    title: "Pacing — the antidote to the boom-and-bust cycle",
    plain:
      "The trap is doing far too much on a good day, paying for it for three days, then doing far too much again on the next good day. Pacing means spreading activity out and stopping before the pain forces you to. The Pain Toolkit calls it one of the key tools, and most people with chronic pain are doing the opposite of it.",
    quote: "Learn to pace yourself. Pacing daily activities is one of the key tools to self managing your pain.",
    source: "pain_toolkit",
    sourceUrl: "https://www.paintoolkit.org/pain-tools",
  },
  {
    id: "pt-setback-plan",
    condition: "*",
    domain: "selfmanagement",
    priority: 1,
    title: "Have a setback plan before you need one",
    plain:
      "Flares and setbacks will happen. Deciding what you'll do in one — which medicine, who you'll ring, what you'll stop doing — while you're calm and comfortable is far easier than deciding it at 2am in pain. Write it down with your GP.",
    quote: "Developing a setback plan is good pain self management.",
    source: "pain_toolkit",
    sourceUrl: "https://www.paintoolkit.org/pain-tools",
  },
  {
    id: "pt-movement-fear",
    condition: "*",
    domain: "activity",
    priority: 1,
    myth: true,
    title: "Exercise will not cause more damage",
    plain:
      "Many people with pain avoid exercise because they fear it will make things worse. The Pain Toolkit addresses this head-on: it is not true. Meaningful movement — the kind you actually care about doing — is one of the twelve tools, not a risk to be managed.",
    quote:
      "Many people with pain fear exercise in case it causes more problems. However this is not true.",
    source: "pain_toolkit",
    sourceUrl: "https://www.paintoolkit.org/pain-tools",
  },
  {
    id: "pt-acceptance",
    condition: "*",
    domain: "psychological",
    priority: 2,
    title: "Acceptance is the first tool, not giving up",
    plain:
      "The Pain Toolkit puts acceptance first of its twelve tools — accepting that the pain is persistent, so you can stop waiting to be fixed and start living around it. This is not resignation. It is the thing that unlocks all the others.",
    quote:
      "Accept that you have persistent pain and then begin to move on. Acceptance is the first and the most important tool in your pain self management toolkit.",
    source: "pain_toolkit",
    sourceUrl: "https://www.paintoolkit.org/pain-tools",
  },
  {
    id: "pt-be-patient",
    condition: "*",
    domain: "psychological",
    priority: 2,
    title: "It takes weeks to months to see change",
    plain:
      "Nothing here works in a week. The Pain Toolkit is explicit that improvements take a few weeks or months — so judging a new exercise program or medicine after five days will lead you to abandon things that were about to work.",
    quote:
      "Be patient with yourself. Take things steadily. It may take you a few weeks or months to see changes or improvements.",
    source: "pain_toolkit",
    sourceUrl: "https://www.paintoolkit.org/pain-tools",
  },
  {
    id: "pt-teamwork",
    condition: "*",
    domain: "selfmanagement",
    priority: 2,
    title: "Self-management works with your GP, not instead of them",
    plain:
      "The Pain Toolkit is clear that self-management is done in collaboration with your GP and healthcare team — it is teamwork, not a substitute. Which is exactly what Co-Motion is for: it holds the questions between your appointments; it does not replace them.",
    quote:
      "Self-management should always work in collaboration with your GP's/Healthcare professional.",
    source: "pain_toolkit",
    sourceUrl: "https://www.paintoolkit.org/",
  },
  {
    id: "pt-support-team",
    condition: "*",
    domain: "psychological",
    priority: 2,
    title: "Build a support team — doing this alone is harder",
    plain:
      "Getting help and support from others is one of the twelve tools. That can mean a peer support group, a forum, or a help line staffed by people who have heard your question a hundred times. There are free Australian options for all three.",
    quote:
      "Get involved, start building a support team. Being successful in pain self management means getting both help and support from others.",
    source: "pain_toolkit",
    sourceUrl: "https://www.paintoolkit.org/pain-tools",
    seeAlso: ["chronic_pain_au", "mha"],
  },
  {
    id: "pt-relaxation",
    condition: "*",
    domain: "psychological",
    priority: 3,
    title: "Relaxation skills are a pain tool, not a luxury",
    plain:
      "Pain tenses muscles and winds up the mind, and both feed back into more pain. Relaxation skills are listed as one of the twelve tools for that reason. painHEALTH has modules on mindfulness and on sleep, which is the other half of this.",
    quote:
      "Learn relaxation skills. Relaxation skills are very important for tense muscles in the body and for unwinding the mind.",
    source: "pain_toolkit",
    sourceUrl: "https://www.paintoolkit.org/pain-tools",
    seeAlso: ["painhealth"],
  },

  // ================================================== UNIVERSAL — painHEALTH modules
  {
    id: "ph-understanding-pain",
    condition: "*",
    domain: "psychological",
    priority: 1,
    title: "Understanding how pain works is itself a treatment",
    plain:
      "In persistent pain, the alarm system becomes over-sensitive — the pain is real, but it stops being a reliable signal of damage. painHEALTH has modules on how pain works and on neuroplasticity, which is the basis for why the pain can change. Learning this is not being told the pain is 'in your head'. It is the mechanism by which people get better.",
    source: "painhealth",
    sourceUrl: "https://painhealth.com.au/pain-module/about-pain/",
  },
  {
    id: "ph-movement-with-pain",
    condition: "*",
    domain: "activity",
    priority: 1,
    title: "There is a way to move that works when you're in pain",
    plain:
      "Moving when it hurts is a skill, not just a matter of willpower. painHEALTH's modules cover movement with pain, pacing and goal setting — how to start, how much, and how to build without triggering a flare each time.",
    source: "painhealth",
    sourceUrl: "https://painhealth.com.au/pain-module/movement-with-pain/",
  },
  {
    id: "ph-sleep",
    condition: "*",
    domain: "psychological",
    priority: 2,
    title: "Sleep and pain feed each other",
    plain:
      "Poor sleep makes pain worse the next day, and pain wrecks sleep — a loop worth attacking directly rather than waiting for the pain to fix itself. painHEALTH has a dedicated module on it.",
    source: "painhealth",
    sourceUrl: "https://painhealth.com.au/pain-module/sleep-and-pain/",
  },
  {
    id: "ph-work",
    condition: "*",
    domain: "selfmanagement",
    priority: 3,
    title: "Staying at work is usually better for you than stopping",
    plain:
      "Work-related pain has its own module on painHEALTH, and MHA runs a WorkWise program. If pain is threatening your job, get advice early rather than after you have stopped — the options are much better while you are still in the role.",
    source: "painhealth",
    sourceUrl: "https://painhealth.com.au/pain-module/work-related-pain/",
    seeAlso: ["mha"],
  },

  // ================================================== UNIVERSAL — exercise access (MHA / NSW)
  {
    id: "mha-chair-exercise",
    condition: "*",
    domain: "activity",
    priority: 2,
    title: "If standing exercise is not possible, chair-based exercise is real exercise",
    plain:
      "MHA runs a free chair-based video series — aerobic, strength and flexibility work, in six levels from Fundamentals to advanced. It is built for people with arthritis, back pain and osteoporosis. The guidance is to check with your healthcare team first, use a sturdy chair, start slowly and build up, and warm up and cool down each time. 'I can't get to a gym' is not the end of the conversation.",
    quote: "Keep your movements steady… start slowly and build up.",
    source: "mha",
    sourceUrl: "https://muscha.org/chair-based-exercise",
  },
  {
    id: "nsw-find-a-program",
    condition: "*",
    domain: "activity",
    priority: 2,
    title: "Find an exercise program near you (NSW)",
    plain:
      "NSW Health's Active and Healthy site lets you search actual classes by suburb and distance — tai chi, aqua aerobics, walking groups, yoga — plus virtual programs you can do statewide from home. It's aimed at older adults. Knowing exercise is the treatment is one thing; having somewhere to actually go is the thing that makes it happen.",
    source: "active_healthy",
    sourceUrl: "https://www.activeandhealthy.nsw.gov.au/find-a-program",
  },
  {
    id: "nsw-get-healthy",
    condition: "*",
    domain: "weight",
    priority: 1,
    title: "Free NSW health coaching — 10 calls, no cost, no referral needed",
    plain:
      "The Get Healthy Service gives anyone in NSW aged 16+ up to 10 confidential calls with a qualified health coach, free. They coach on nutrition, physical activity, weight and cutting down alcohol — which between them cover most of the lifestyle side of an MSK care plan. Call 1300 806 258, or sign up online. This is the most concrete thing on this page and almost nobody knows it exists.",
    quote:
      "The Get Healthy Service is a free phone and online health coaching program supporting people aged 16 and over in NSW.",
    source: "get_healthy",
    sourceUrl: "https://www.nsw.gov.au/health-and-wellbeing/healthy-living/gethealthyservice",
  },
  {
    id: "nsw-get-healthy-nutrition",
    condition: "*",
    domain: "nutrition",
    priority: 1,
    title: "Coaching on food and drink, free, without seeing a dietitian privately",
    plain:
      "If the diet part of your care plan is where you're stuck, the Get Healthy Service coaches on making healthier food choices and on drinking less alcohol — the two levers that matter most in gout. Free, by phone, for any NSW resident 16 and over.",
    source: "get_healthy",
    sourceUrl: "https://www.nsw.gov.au/health-and-wellbeing/healthy-living/gethealthyservice",
  },

  // ================================================== UNIVERSAL — ACI (NSW Health's own)
  {
    id: "aci-self-management",
    condition: "*",
    domain: "selfmanagement",
    priority: 1,
    title: "NSW Health has a free pain self-management site — most people have never heard of it",
    plain:
      "The ACI Pain Management Network is NSW Health's own chronic pain resource: video, evidence-based information, and interactive self-management tools covering psychological therapies, sleep, diet and exercise. It is designed for you to work through yourself, in partnership with your health team — which is exactly the situation you are in while you wait for an appointment. There is a separate channel for young people.",
    source: "aci",
    sourceUrl: "https://aci.health.nsw.gov.au/chronic-pain/for-everyone",
  },
  {
    id: "aci-less-medication",
    condition: "*",
    domain: "selfmanagement",
    priority: 2,
    title: "The goal is a strategy, not a stronger prescription",
    plain:
      "The ACI network's stated objective is to improve life with chronic pain through self-management strategies — with reduced reliance on prescription medication. That is NSW Health's position, not a fringe view. If your instinct in a flare is that you need something stronger, the evidence points the other way.",
    source: "aci",
    sourceUrl: "https://aci.health.nsw.gov.au/chronic-pain",
  },

  // ================================================== UNIVERSAL — Painaustralia factsheet 10
  {
    id: "pa-gp-management-plan",
    condition: "*",
    domain: "selfmanagement",
    priority: 0,
    headline: true,
    title: "Ask your GP for a chronic condition management plan",
    plain:
      "This is the most useful thing on this page and almost nobody is told about it. Your GP — not your specialist — can put you on a Medicare plan for long-term conditions. If you qualify, it pays for a set number of subsidised physiotherapy, exercise physiology or psychology visits this year. You do not wait six months for the specialist to get this. You ask your GP, and since July 2025 they can refer you straight to a physio without any extra paperwork. There may still be a gap to pay, so ask what it will cost before you book.",
    script:
      "I've got a long-term condition and I'm not coping between appointments. Can we do a GP chronic condition management plan so I can see a physio?",
    scriptNote:
      "Ask for a longer appointment, and say it's for a care plan. Use those exact words — the name changed in July 2025 and the old one may get you a blank look.",
    quote:
      "GP chronic condition management plan items replaced GP Management Plans and Team Care Arrangements on 1 July 2025… GPs and PMPs can refer patients with a GPCCMP directly to relevant services.",
    source: "health_gov",
    sourceUrl: "https://www.health.gov.au/our-work/upcoming-changes-to-mbs-chronic-disease-management-arrangements",
    // Painaustralia's factsheet (June 2016) is what pointed us at this, but it still
    // calls it a "GP Management Plan" and a "Team Care Arrangement" — both retired on
    // 1 July 2025. A patient who repeats the old name at a reception desk gets a blank
    // look. This is exactly why the library is a hand-curated file that a human checks
    // against the primary source, and not a model paraphrasing whatever it last read.
    supersedes: {
      source: "painaustralia",
      note: "Painaustralia's factsheet (2016) calls this a 'GP Management Plan'. That name was retired on 1 July 2025. We use the current one.",
    },
  },
  {
    id: "pa-medicines-not-the-answer",
    condition: "*",
    domain: "medication",
    priority: 1,
    myth: true,
    title: "Medicines alone are not the most effective way to treat chronic pain",
    plain:
      "This is Painaustralia's headline message, and it runs against most people's instinct. Opioids like codeine contribute on average only about a 30% reduction in pain, bring nausea, drowsiness, constipation and mood change with them, and you build tolerance — so the dose has to keep climbing to do the same job. Chronic pain may never be completely cured, but it can be managed. Waiting for the right tablet is the thing that keeps people stuck.",
    quote:
      "Medicines alone are not the most effective way to treat chronic pain… research has shown they are not effective in the longer term, contributing on average to only a 30 per cent reduction in pain.",
    source: "painaustralia",
    sourceUrl: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
  },
  {
    id: "pa-active-beats-passive",
    condition: "*",
    domain: "selfmanagement",
    priority: 1,
    title: "People who manage their pain daily do better than those who wait to be treated",
    plain:
      "The evidence is that people actively involved in managing their pain day to day end up with less disability than people relying on passive therapies — taking medication, having surgery. What you do between appointments matters more than what happens at them. That is not a consolation for the six-month wait; it is the actual finding.",
    quote:
      "Evidence shows that people with chronic pain who are actively involved in managing their pain on a daily basis have less disability than those who are engaged in passive therapies, such as taking medication or surgery.",
    source: "painaustralia",
    sourceUrl: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
  },
  {
    id: "pa-pacing-flares",
    condition: "*",
    domain: "selfmanagement",
    priority: 1,
    title: "Pacing reduces how often you flare",
    plain:
      "Plan rest and stretch breaks, and keep your physical activity at an even level across the day rather than doing everything while you feel able. Painaustralia is direct that this reduces the risk of flare-ups — so it is not just coping, it is prevention. If you are flaring repeatedly and cannot see anyone, this is the lever you have.",
    quote:
      "Pacing is key to pain management. By planning rest or stretch breaks, and keeping physical activity at an even level throughout the day, you can reduce the risk of flare-ups.",
    source: "painaustralia",
    sourceUrl: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
  },
  {
    id: "pa-walking-stretching",
    condition: "*",
    domain: "activity",
    priority: 1,
    title: "Daily stretching and walking — start small",
    plain:
      "Moderate daily exercise keeps your muscles conditioned and improves your pain levels. If you have not been active in a while, start small and build up over time. A physiotherapist can give you a tailored program — and a GP Management Plan is how you get that subsidised.",
    quote:
      "Moderate daily exercise will keep your muscles conditioned and improve your pain levels. If you haven't been active in a while, start small and increase your activity over time.",
    source: "painaustralia",
    sourceUrl: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
    seeAlso: ["active_healthy"],
  },
  {
    id: "pa-relaxation",
    condition: "*",
    domain: "psychological",
    priority: 2,
    title: "Relaxation, mindfulness and distraction are techniques, not platitudes",
    plain:
      "Tense muscles press on nerves and tissues, which increases pain — so deep-breathing, yoga or meditation reduce pain through a physical mechanism, not by cheering you up. Mindfulness is learning to accept the thoughts and feelings including the pain. Distraction is deliberately focusing on something you enjoy. Desensitisation is learning not to react to the pain negatively, which retrains how your brain processes it. These are named strategies you can start today.",
    quote:
      "When our muscles are tense, they increase pressure on nerves and tissues, which increases pain. To reduce muscle tension, you can use simple deep-breathing techniques, or take a yoga or meditation class.",
    source: "painaustralia",
    sourceUrl: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
  },
  {
    id: "pa-cbt",
    condition: "*",
    domain: "psychological",
    priority: 2,
    title: "Your GP can refer you to a psychologist for CBT",
    plain:
      "Cognitive Behavioural Therapy helps with the factors that come with chronic pain, including depression. This is a referral your GP can make — you do not need the specialist appointment for it. Combined with a GP Management Plan, it comes with a Medicare rebate.",
    quote:
      "CBT is a psychological technique to help people deal with the factors associated with chronic pain, including depression. Your GP can refer you to a psychologist for help with CBT.",
    source: "painaustralia",
    sourceUrl: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
  },
  {
    id: "pa-sleep",
    condition: "*",
    domain: "psychological",
    priority: 2,
    title: "Fix the sleep and the pain gets more bearable",
    plain:
      "A good night's rest helps you cope with pain. If you are sleeping badly, a bedtime ritual and a peaceful bedroom are the starting point. It sounds small next to the pain itself, and it is one of the few things fully within your control tonight.",
    quote: "A good night's rest will help you cope with your pain.",
    source: "painaustralia",
    sourceUrl: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
    seeAlso: ["painhealth"],
  },
  {
    id: "pa-weight-diet",
    condition: "*",
    domain: "weight",
    priority: 2,
    title: "Healthy weight measurably improves musculoskeletal pain",
    plain:
      "Maintaining a healthy weight improves symptoms of chronic pain, and Painaustralia calls out osteoarthritis and other musculoskeletal and joint pain specifically. The route is reducing saturated fats and sugars, plus daily low-impact exercise. Your GP can help you build a weight-loss plan — and in NSW the Get Healthy Service will coach you through it for free.",
    quote:
      "Maintaining a healthy weight can improve symptoms of chronic pain, particularly for people with osteoarthritis and other musculoskeletal or joint pain.",
    source: "painaustralia",
    sourceUrl: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
    seeAlso: ["get_healthy"],
  },
  {
    id: "pa-isolation",
    condition: "*",
    domain: "psychological",
    priority: 2,
    title: "Chronic pain is isolating — and that is treatable too",
    plain:
      "Painaustralia names isolation directly: you may benefit from a support group or online community, and a counsellor if the pain is affecting your work or your relationships at home. Chronic Pain Australia runs both a forum and support groups, and the Pain Link help line is 1300 340 357.",
    quote:
      "Chronic pain can be an isolating experience and you may benefit from joining a support group or online community.",
    source: "painaustralia",
    sourceUrl: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
    seeAlso: ["chronic_pain_au"],
  },
  {
    id: "pa-other-treatments",
    condition: "*",
    domain: "selfmanagement",
    priority: 3,
    title: "Massage, acupuncture and TENS help some people",
    plain:
      "Some people get pain relief from massage, or from treatments that stimulate the nervous system such as acupuncture or a TENS machine. Painaustralia lists these as things that work for some — not as things that work for everyone. If your pain stays severe, your GP can refer you to a pain specialist.",
    source: "painaustralia",
    sourceUrl: "https://www.painaustralia.org.au/static/uploads/files/painaust-factsheet10-final-wfbdhlqkosbm.pdf",
  },
];

// Real services, with real phone numbers. Deliberately hand-listed and never
// model-generated: a hallucinated support group is a patient ringing a dead number
// on their worst day.
export const SUPPORTS = [
  {
    name: "Musculoskeletal Health Australia — B.A.M. Help Line",
    what: "Free national help line (1800 263 265), peer support groups, community webinars, and a health professional locator. Covers arthritis, back pain, gout, osteoporosis and 150+ MSK conditions.",
    phone: "1800 263 265",
    url: "https://muscha.org/get-supported/",
    conditions: ["*"],
  },
  {
    name: "Arthritis Australia",
    what: "Information and support on 1800 011 041, links to the arthritis office in your state, and free condition apps (MyOA, MyRA, MyPsA).",
    phone: "1800 011 041",
    url: "https://arthritisaustralia.org.au/understanding-arthritis/",
    conditions: ["gout", "osteoarthritis", "ra", "*"],
  },
  {
    name: "Chronic Pain Australia",
    what: "Peer support groups, a community forum, and the APMA Pain Link help line (1300 340 357) — people who live with chronic pain, not just clinicians.",
    phone: "1300 340 357",
    url: "https://chronicpainaustralia.org.au/painsupportgroups/",
    conditions: ["*"],
  },
  {
    name: "NSW Get Healthy Service",
    what: "Up to 10 free coaching calls on nutrition, activity, weight and alcohol. NSW residents 16+. No referral needed.",
    phone: "1300 806 258",
    url: "https://www.nsw.gov.au/health-and-wellbeing/healthy-living/gethealthyservice",
    conditions: ["*"],
  },
  {
    name: "Active and Healthy (NSW Health)",
    what: "Search local and virtual exercise programs by suburb — tai chi, aqua aerobics, walking groups, yoga.",
    url: "https://www.activeandhealthy.nsw.gov.au/find-a-program",
    conditions: ["*"],
  },
  {
    name: "ACI Pain Network (NSW)",
    what: "The NSW chronic pain network — pain services and pathways across the state.",
    url: "https://aci.health.nsw.gov.au/chronic-pain",
    conditions: ["*"],
  },
  {
    name: "painHEALTH",
    what: "Self-management modules: understanding pain, movement, pacing and goal setting, sleep, mindfulness, medicines, work.",
    url: "https://painhealth.com.au/pain-management/",
    conditions: ["*"],
  },
  {
    name: "Pain Toolkit",
    what: "The twelve tools for pain self-management, free, in print, digital and audio.",
    url: "https://www.paintoolkit.org/pain-tools",
    conditions: ["*"],
  },
  {
    name: "healthdirect",
    what: "24-hour health advice line (1800 022 222) if you are unsure whether a symptom needs care tonight.",
    phone: "1800 022 222",
    url: "https://www.healthdirect.gov.au/",
    conditions: ["*"],
  },
  {
    name: "Rare Voices Australia",
    what: "If your condition is rare and doesn't fit the usual pathways — the Rare Disease Disability Toolkit.",
    url: "https://rarevoices.org.au/rare-disease-disability-project/rare-disease-disability-toolkit/",
    conditions: ["*"],
  },
];

export const evidenceFor = (condition) =>
  EVIDENCE.filter((e) => e.condition === condition || e.condition === "*").sort(
    (a, b) => a.priority - b.priority,
  );

export const supportsFor = (condition) =>
  SUPPORTS.filter((s) => s.conditions.includes(condition) || s.conditions.includes("*"));

export const byId = (id) => EVIDENCE.find((e) => e.id === id);
