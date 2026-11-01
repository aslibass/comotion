// THE RAIL — the whole point of the product.
//
// Every answer Co-Motion gives ends on one of five rungs. Most questions land on the
// bottom two, which is the objective: keep people managing at home and out of hospital.
// But the rail only earns trust if it reliably catches the small number of questions
// where "manage it at home" is the wrong answer and someone dies of it.
//
// So the red-flag screen below runs BEFORE the model and sets a FLOOR. index.js takes
// max(ruleFloor, modelDisposition). The model can escalate. It can never soften.
//
// That asymmetry is the safety argument, and it is enforced in code rather than in a
// prompt, because a prompt is a request and code is a guarantee.
//
// The screen is deliberately over-sensitive. A false ED referral costs a wasted evening.
// A missed septic arthritis costs a joint, and sometimes a life. Those are not
// symmetrical errors and the thresholds do not pretend they are.
//
// Nothing in this file calls a model. It must keep working with no API key.

// The five rungs. Copy rewritten after review — the old "no need to contact anyone"
// closed a door this tool has no right to close, and "a pharmacist can settle this for
// free" was quietly wrong (the advice is free; the tablets are not).
//
// `level` is shown as "3 of 5". Colour must never be the only carrier of urgency: at
// 2am, on a dimmed phone with Night Shift on, a red and an orange are the same pixel.
// The words and the number do the work; colour only confirms it.
export const RUNGS = {
  SELF_MANAGE: {
    rank: 0,
    level: "1 of 5",
    label: "You can do this at home",
    detail: "If it's worse tomorrow, or it hasn't settled in a few days, ring your GP.",
  },
  PHARMACIST: {
    rank: 1,
    level: "2 of 5",
    label: "Your pharmacist can help with this today",
    detail: "No appointment. Talking to them costs nothing, and many are open late.",
  },
  GP_NEXT: {
    rank: 2,
    level: "3 of 5",
    label: "This one's for your GP, and it can wait",
    detail: "We've written it down for you — it's in your list below. Take it to your next visit.",
  },
  GP_NOW: {
    rank: 3,
    level: "4 of 5",
    label: "Call your GP today",
    detail:
      "Call your practice and tell them it's a flare. If they can't fit you in, call healthdirect on 1800 022 222 — a nurse answers, any hour.",
    call: { label: "Call healthdirect — a nurse, any hour", number: "1800 022 222" },
  },
  ED: {
    rank: 4,
    level: "5 of 5 — the highest",
    label: "Get seen tonight",
    detail:
      "Don't wait for a GP appointment. If you can't get to an emergency department, or you're not sure, call healthdirect now and a nurse will tell you what to do. If you are very unwell, call 000.",
    call: { label: "Call healthdirect now — free, 24 hours", number: "1800 022 222" },
  },
};

export const rankOf = (rung) => RUNGS[rung]?.rank ?? 0;
export const higher = (a, b) => (rankOf(a) >= rankOf(b) ? a : b);

// Phrase patterns, not single keywords — "fever" alone is not a red flag, but a fever
// with a hot swollen joint is septic arthritis until proven otherwise.
//
// Each flag names the thing being caught, in plain words, because the patient is shown
// exactly why they were sent. An unexplained "go to ED" gets ignored; an explained one
// gets acted on.
const FLAGS = [
  {
    id: "septic-joint",
    floor: "ED",
    conditions: ["gout", "knee_oa", "ra", "*"],
    catches: "A hot, swollen joint together with fever or feeling generally unwell",
    why:
      "An infected joint (septic arthritis) looks almost exactly like a gout or arthritis flare — hot, red, swollen, agonising. The difference is that an infected joint destroys itself within days and can make you dangerously unwell. It cannot be told apart from a flare without testing the fluid in the joint. This is the single most important reason not to assume a bad flare is 'just' a flare.",
    // NOTE, and it is the point of the whole triage card: this pattern list started
    // out missing "my toe is agony and I feel hot and shivery" — a textbook septic
    // joint — because "shivery" was not on it. That is not a bug you fix by adding one
    // word. It is proof that you cannot screen for danger by guessing which nouns a
    // frightened person will reach for. The words below are defence in depth. The
    // three questions in TRIAGE are the actual safety net.
    any: [
      [/\b(fever|feverish|temperature|temp|shiver\w*|chills?|rigors?|sweats?|sweaty|clammy|unwell|shaking|shakes|flu[- ]?like|hot and cold|burning up)\b/i,
       /\b(joint|knee|toe|ankle|elbow|wrist|hip|shoulder|foot|finger|hot|swollen|red|inflamed|puffy)\b/i],
      [/\b(hot|burning|red|inflamed|swollen)\b/i,
       /\b(fever|feverish|temperature|chills?|rigors?|shiver\w*|unwell|vomiting|sick|confused|sweaty)\b/i],
    ],
  },
  {
    id: "cauda-equina",
    floor: "ED",
    conditions: ["low_back_pain", "*"],
    catches: "Back pain with numbness in the saddle area, or loss of bladder or bowel control, or new weakness in both legs",
    why:
      "These are signs the nerves at the base of the spine are being compressed (cauda equina syndrome). It is one of the few genuine emergencies in back pain, and the damage becomes permanent within hours. Everything else about back pain can wait. This cannot.",
    any: [
      [/\b(numb|numbness|pins and needles|no feeling|can't feel|cannot feel)\b/i, /\b(saddle|groin|genitals|private|buttock|between my legs|inner thigh|bottom)\b/i],
      [/\b(can't|cannot|unable to|lost|losing|leaking|incontinent|no control)\b/i, /\b(wee|pee|urinat|bladder|bowel|poo|toilet|control)\b/i],
      [/\b(both legs|legs are|leg)\b/i, /\b(weak|weakness|giving way|collaps|can't walk|cannot walk|dragging)\b/i],
    ],
  },
  {
    id: "allopurinol-rash",
    floor: "ED",
    conditions: ["gout", "*"],
    catches: "A new rash, blisters or mouth ulcers after starting allopurinol",
    why:
      "Allopurinol can rarely trigger a severe allergic skin reaction. Caught early it is survivable; ignored for a few days it can be fatal. Any new rash after starting allopurinol is treated as that reaction until proven otherwise — stop the drug and be seen the same day.",
    any: [
      [/\b(rash|blister|blisters|peeling|hives|welts|spots|mouth ulcer|ulcers in my mouth|skin.*(coming off|peeling))\b/i, /\b(allopurinol|febuxostat|new medication|new tablet|started.*(medicine|tablet|drug))\b/i],
    ],
  },
  {
    id: "gi-bleed",
    floor: "ED",
    conditions: ["*"],
    catches: "Black or tarry stools, or vomiting blood, while taking anti-inflammatories",
    why:
      "Anti-inflammatories (ibuprofen, naproxen, diclofenac and the rest) can cause bleeding in the stomach. Black tarry stools or vomit that looks like coffee grounds mean it is already bleeding. This is an emergency regardless of how well you otherwise feel.",
    any: [
      [/\b(black|tarry|dark)\b.{0,25}\b(stools?|poo|poos|motions?|bowels?|faeces|feces)\b/i],
      [/\b(vomit\w*|throwing up|bringing up|coughing up|threw up)\b.{0,30}\b(blood|coffee)\b/i],
      [/\bblood\b.{0,25}\b(stools?|poo|vomit|when I go|motions?)\b/i],
    ],
  },
  {
    id: "chest-breathing",
    floor: "ED",
    conditions: ["*"],
    catches: "Chest pain or difficulty breathing",
    why: "Neither belongs to your musculoskeletal condition and both can be immediately life-threatening. This is not something to work out at home.",
    any: [
      [/\b(chest pain|pain in my chest|tight chest|crushing)\b/i],
      [/\b(can't breathe|cannot breathe|short of breath|breathless|struggling to breathe|gasping)\b/i],
    ],
  },
  {
    id: "trauma",
    floor: "ED",
    conditions: ["*"],
    catches: "Unable to put weight on it after a fall or injury, or the joint looks deformed",
    why: "That pattern suggests a fracture or dislocation rather than a flare, and it needs an X-ray.",
    any: [
      [/\b(fell|fall|injur|twisted|accident|hit it|banged)\b/i, /\b(can't (walk|stand|weight|put weight)|cannot (walk|stand)|deformed|crooked|out of place|bone)\b/i],
    ],
  },
  {
    // Added when Co-Motion widened from a handful of conditions to a navigator spanning
    // the whole MSK repository: that broader surface pulls in the older, polymyalgia-
    // adjacent population, and giant cell arteritis is the sight-threatening emergency
    // that hides among them. Vision change is the part that cannot wait.
    id: "giant-cell-arteritis",
    floor: "ED",
    conditions: ["*"],
    catches: "A new headache at the temple, jaw ache when chewing, scalp tenderness, or any change to vision — especially over 50",
    why:
      "In people over 50 these can be giant cell arteritis — inflammation of the arteries at the temple. Untreated it can cause sudden and permanent loss of vision within days, so it is treated as an emergency. A change to your vision in particular cannot wait.",
    any: [
      [/\b(blur\w*|double vision|lost? (?:my )?(?:vision|sight)|can'?t see|cannot see|going blind|grey curtain|black curtain|vision (?:loss|gone)|loss of (?:vision|sight))\b/i,
       /\b(headache|head|temple|jaw|scalp|eye|over 50|older)\b/i],
      [/\b(headache|temple|one side of my head|scalp (?:tender|sore|hurts))\b/i,
       /\bjaw\b.{0,20}\b(chew\w*|eat\w*|ache|pain|hurts|cramp|tired)\b/i],
    ],
  },
  {
    id: "sinister-back",
    floor: "GP_NOW",
    conditions: ["low_back_pain", "*"],
    catches: "Back pain with unexplained weight loss, night pain that wakes you, or a history of cancer",
    why:
      "The overwhelming majority of back pain is benign, and most people worry about cancer without cause. But this specific combination is the one pattern that warrants prompt investigation rather than reassurance — so it is checked rather than assumed.",
    any: [
      [/\b(back|spine)\b/i, /\b(weight loss|losing weight|lost weight)\b/i],
      [/\b(back|spine|pain)\b/i, /\b(cancer|tumour|tumor|malignan|chemo)\b/i],
      [/\b(wakes me|wake up|at night|night pain|can't sleep because)\b/i, /\b(back|spine)\b/i],
    ],
  },
  {
    id: "immunosuppressed-fever",
    floor: "GP_NOW",
    conditions: ["ra", "*"],
    catches: "Fever or feeling unwell while taking methotrexate, a biologic or another immune-suppressing medicine",
    why:
      "These medicines blunt your body's response to infection, so an infection can be advanced while still looking mild. A fever on a DMARD or biologic is reviewed promptly rather than watched.",
    any: [
      [/\b(fever|temperature|unwell|infection|sick|flu)\b/i, /\b(methotrexate|biologic|adalimumab|etanercept|infliximab|rituximab|dmard|immune|prednisolone|steroid)\b/i],
    ],
  },
  {
    id: "spreading-neuro",
    floor: "GP_NOW",
    conditions: ["*"],
    catches: "New or spreading numbness, weakness, or pins and needles",
    why: "New nerve symptoms are not part of a musculoskeletal flare and want assessing before they progress.",
    any: [
      [/\b(numb|numbness|weakness|weak|pins and needles|tingling)\b/i, /\b(spreading|getting worse|new|worse|up my|down my|both)\b/i],
    ],
  },
];

// THE THREE QUESTIONS.
//
// The regex screen above reads what the person happened to type. That is not good
// enough on its own and we should be honest about why: someone with septic arthritis
// types "my toe is agony and I feel hot and shivery". "Shivery" is not "fever". "Feel
// hot" is not "febrile". A pattern-match over free text has unknown recall, and the
// one case it must never miss is the one where the patient doesn't know which word
// matters.
//
// So we ask. Three questions, every time, before the model sees anything. They cover
// the three things that masquerade as a musculoskeletal flare and destroy someone:
// an infected joint, a compressed spinal cord, and a severe drug reaction.
//
// "Not sure" counts as YES. A person in pain at 2am who is not sure whether they have
// a fever is a person who needs a nurse, not a language model. The asymmetry is
// deliberate: a false alarm costs a phone call, a miss costs a joint.
export const TRIAGE = [
  {
    id: "t-septic",
    ask: "Is a joint hot, red or swollen — and you also feel feverish, shivery, or generally unwell?",
    floor: "ED",
    catches: "A hot joint together with feeling feverish or unwell",
    why:
      "An infected joint looks exactly like a gout or arthritis flare — hot, red, swollen, agonising. The difference is that an infection can destroy the joint in a day or two, and the only way to tell them apart is to test the fluid in the joint. If you have had thirty flares and this feels like the thirty-first, that is precisely when this gets missed.",
  },
  {
    id: "t-cauda",
    ask: "Any new numbness around your groin or between your legs, or trouble controlling your bladder or bowel?",
    floor: "ED",
    catches: "Numbness in the saddle area, or loss of bladder or bowel control",
    why:
      "These are signs that the nerves at the base of the spine are being squeezed. It is one of the very few emergencies in back pain, and the damage becomes permanent within hours. Everything else about back pain can wait. This cannot.",
  },
  {
    id: "t-rash",
    ask: "Any new rash, blisters, or ulcers in your mouth since starting a new medicine?",
    floor: "ED",
    catches: "A new rash or mouth ulcers after starting a new medicine",
    why:
      "Some medicines — allopurinol among them — can rarely trigger a severe reaction that starts in the skin. Caught early it is treatable. Left for a few days it can kill you. Arthritis Australia's own advice is to contact a doctor straight away.",
  },
  {
    // Over-50s only in practice, but the question self-qualifies, and this audience skews
    // older. The free-text screen cannot be relied on to catch it (the same lesson as the
    // septic joint), so it is asked.
    id: "t-gca",
    ask: "Are you over 50 with a new headache at your temple or scalp, aching in your jaw when you chew, or any change to your vision?",
    floor: "ED",
    catches: "New temple headache, jaw pain on chewing, or a change to vision in someone over 50",
    why:
      "Together these can be giant cell arteritis — inflamed arteries at the temple — which can cause sudden, permanent loss of vision within days if it is not treated quickly. A change to your vision especially cannot wait.",
  },
];

// Yes OR "not sure" fires. Only an explicit "no" clears it.
export function triageScreen(answers = {}) {
  const hits = TRIAGE.filter((q) => {
    const a = answers[q.id];
    return a === "yes" || a === "unsure";
  });
  return {
    floor: hits.reduce((acc, q) => higher(acc, q.floor), "SELF_MANAGE"),
    flags: hits.map(({ id, floor, catches, why }) => ({ id, floor, catches, why })),
  };
}

// A flag fires when ANY of its clause groups fires, and a clause group fires only when
// EVERY pattern in it is present. That AND-within-OR shape is what stops the word
// "fever" on its own from routing a worried person to an emergency department.
function fires(flag, text) {
  return flag.any.some((group) => group.every((re) => re.test(text)));
}

export function screen({ condition, question }) {
  const text = String(question || "");
  const hits = FLAGS.filter(
    (f) => (f.conditions.includes(condition) || f.conditions.includes("*")) && fires(f, text),
  );

  const floor = hits.reduce((acc, f) => higher(acc, f.floor), "SELF_MANAGE");

  return {
    floor,
    flags: hits.map(({ id, floor, catches, why }) => ({ id, floor, catches, why })),
  };
}

// Shown in the interface at all times, not only when something fires. A patient who
// knows the four things that mean "go now" is a patient who goes at the right time —
// and, just as importantly, doesn't go for the other forty things.
export const ALWAYS_VISIBLE = FLAGS.filter((f) => f.floor === "ED").map((f) => ({
  id: f.id,
  catches: f.catches,
  why: f.why,
}));
