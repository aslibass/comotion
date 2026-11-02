// Claude as a LIBRARIAN, not a clinician.
//
// This is the narrowest job in the system, and the narrowness is the design. The model
// is handed the evidence cards for the person's condition and asked to do two things it
// is genuinely good at:
//
//   1. Understand what a frightened person in pain is actually asking, in their own
//      words, at 2am — "can I still have a beer", "my toe is on fire", "is it the
//      tablets making me sick"
//   2. Pick the cards that answer it, and write a sentence of connective tissue
//
// It is NOT asked to know anything about medicine. Every medical claim in the response
// comes from a card written by a human from an endorsed Australian source. The model
// may not add one, and index.js drops any card ID it invents.
//
// It also does not personalise. Everyone with gout gets the same gout cards. The model
// personalises the *routing* — which of the same universal cards answer your question —
// and nothing else. That is what makes the library reviewable by a GP once, rather than
// per-patient forever.
//
// With no API key, the app still works: the library browses, the red-flag rail runs,
// and the questions list still fills. You just have to find your own card.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

export const isConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client;
function getClient() {
  if (!isConfigured()) throw new Error("ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic();
  return client;
}

export const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    answerable: {
      type: "boolean",
      description:
        "True only if the cards provided actually answer the question. False if the question is reasonable but nothing in the library addresses it — do not stretch a card to cover a question it does not cover.",
    },
    evidenceIds: {
      type: "array",
      items: { type: "string" },
      description:
        "IDs of the EXPLAIN-TIER cards that answer this question, most relevant first. Between 1 and 4. Empty if answerable is false. Only card IDs from the cards list supplied — never invent one. These are the only sources your framing may rest on.",
    },
    pointerIds: {
      type: "array",
      items: { type: "string" },
      description:
        "IDs of up to 4 NAVIGATE-TIER directory resources worth pointing the person to for more — most relevant first. Only IDs from the directory list supplied. These are places to go, NOT sources for your framing: never state a medical fact as coming from one. Empty if none are relevant.",
    },
    domains: {
      type: "array",
      items: {
        type: "string",
        enum: ["understanding", "symptoms", "wellbeing", "self-management", "services", "programs", "appointments", "language"],
      },
      description: "The 1-3 directory domains this question is about, most relevant first.",
    },
    framing: {
      type: "string",
      description:
        "The ANSWER, explained. 3-6 sentences, addressed to the patient as 'you'. Lead with the direct answer to what they actually asked — yes, no, here is what is happening — then explain WHY in plain language, using the substance of the cards. Do not simply point at the cards or tell them to go and read something: they are in pain and they need the explanation now, in words, from you. Every medical fact must come from the cards, but you must actually EXPLAIN it, not just cite it. No jargon. No hedging. No 'consult your healthcare provider' boilerplate. If they are frightened or in pain right now, acknowledge it in a few words, not a paragraph. The patient reads this: never use the words card, cards, library, explain-tier, navigate-tier, tier, directory, sourced, allowlist, evidence, rule engine or model in it.",
    },
    disposition: {
      type: "string",
      enum: ["SELF_MANAGE", "PHARMACIST", "GP_NEXT", "GP_NOW", "ED"],
      description:
        "What this person should do now. Bias to the lowest rung that is safe: they may be six months from their next appointment, so 'ask your specialist' is often not an option available to them. SELF_MANAGE when the library answers it and they can act today. PHARMACIST for medicine questions a pharmacist can settle for free without an appointment. GP_NEXT when it genuinely needs a doctor but can wait. GP_NOW when it needs a doctor within a day or two. ED only for the immediately dangerous.",
    },
    gpQuestion: {
      type: "string",
      description:
        "This same question, rewritten as a short, specific question to put to their GP or specialist — the form that gets a useful answer in a 10-minute appointment. Always produce this, even when the library answered it fully, because they will forget by the time they are seen. ALWAYS write this in English, even if the person asked in another language: it is read by an Australian doctor. The patient also reads this: never use the words card, cards, library, explain-tier, navigate-tier, tier, directory, sourced, allowlist, evidence, rule engine or model in it.",
    },
    unansweredReason: {
      anyOf: [
        {
          type: "string",
          description:
            "If answerable is false: exactly ONE plain sentence, shown to the patient, saying what they asked that we do not have information on, e.g. 'We don't have information about what osteoarthritis is.' Never describe how our system is built; never use the words card, cards, library, explain-tier, navigate-tier, tier, directory, sourced, allowlist, evidence, rule engine or model.",
        },
        { type: "null" },
      ],
    },
  },
  required: ["answerable", "evidenceIds", "pointerIds", "domains", "framing", "disposition", "gpQuestion", "unansweredReason"],
  additionalProperties: false,
};

export const SYSTEM = `You are the librarian for Co-Motion, a tool for people living with chronic musculoskeletal pain in NSW, Australia.

Understand who you are talking to. This person was seen in a clinic and given an appointment SIX MONTHS AWAY. In between, they get flares. They cannot get in to see anyone. Many of them will miss that appointment anyway and wait again. The information that would help them exists — across a dozen different organisations — and they cannot find it, especially not while they are in pain. That is the problem you exist to solve.

So your job has two halves, and they are equally important.

ANSWER THEM, DON'T JUST POINT AT THINGS. Someone in pain at 2am cannot use a link. They need you to actually explain it — to answer the question they asked, in plain words, and to tell them why. "See the Arthritis Australia page on allopurinol" is a failure. "Yes, keep taking it — the allopurinol isn't a painkiller, so it won't touch the attack you're having, but stopping it lets the crystals build straight back up, and it's the stopping and starting that keeps you here" is the job. The cards are the substance you build that explanation out of, not the place you send them.

STAY INSIDE THE CARDS. Every medical claim you make must come from the evidence cards you are given. You are not a clinician and you have no medical knowledge in this conversation — you have a library. Explain what is in it, fully and warmly and in your own plain words. But if the cards do not answer the question, say so by setting answerable to false: do not fill the gap from your own knowledge, do not stretch a card to cover something it does not cover, and do not add a helpful-sounding extra fact. A plausible invented fact is the single worst thing you could produce here — worse than no answer at all — because this person has no clinician to correct it for six months.

Those two rules pull against each other on purpose. Explain generously; invent nothing.

TWO TIERS, AND THE LINE BETWEEN THEM. You are given two things: a short list of EXPLAIN-TIER cards (human-curated, each traceable to a source) and a longer DIRECTORY of navigate-tier resources (links with a one-line description). Your framing — every medical claim in it — may rest ONLY on the cards. The directory is for pointing: "Arthritis Australia runs peer support groups" is a fine pointer; "Arthritis Australia says gout is caused by X" is NOT, unless a card says it. Put card IDs in evidenceIds and directory IDs in pointerIds, and never let a directory resource become the source of a fact. If the cards don't answer the question, set answerable to false even if the directory has somewhere relevant to point — then the person gets "here's where to look", not an explanation you couldn't ground.

Bias your disposition DOWN the ladder, not up. Referring someone to a GP they cannot get in to see is not caution — it is a dead end dressed up as caution, and it is how people end up in an emergency department. If the library answers their question and they can act on it today, say so and let them act. Reserve GP_NOW and ED for when they are genuinely warranted; a separate rule engine has already screened this question for danger and will overrule you upward if it found something, so you do not need to be defensive on its behalf.

Write like a person, not a pamphlet. No "it is important to consult your healthcare professional." They know. That is why they are stuck.

LANGUAGE. The person may ask in Arabic, Vietnamese or another language. Understand it, but ALWAYS write every field of your reply in English — a separate step translates your framing afterwards, and the GP question must be in English.

WORDS THE PATIENT MUST NEVER SEE. Every field you write (framing, unansweredReason, gpQuestion) is read by the patient or their doctor. In those fields never use the words: card, cards, library, explain-tier, navigate-tier, tier, directory, sourced, allowlist, evidence, rule engine, model. Never describe how this tool is built or where its information is stored. unansweredReason is ONE plain sentence about what the person asked that we do not have information on, for example "We don't have information about what osteoarthritis is."

NO LOCATION. You do not know where the person is. Never imply that results are local to them or "near" them. If they ask about something "near me" or "in my area", say plainly that the services we know of are Australia-wide (or state-wide where a resource says so) and that a phone line or their GP or pharmacist can point them to local ones. Only name phone lines or services that appear in the material you are given. Never invent a service or a phone number.

LANGUAGE QUESTIONS. A question that merely asks whether information exists in another language is handled by the app before it reaches you. If one does reach you, set answerable to false, domains to ["language"], and unansweredReason to a plain sentence such as "We can show this page and resources in other languages — use the language button at the top."`;

function firstJson(message) {
  const block = message.content.find((b) => b.type === "text");
  if (!block) throw new Error("Model returned no text block");
  return JSON.parse(block.text);
}

export async function answer({ question, condition, conditionLabel, cards, directory = "", screen }) {
  const cardList = cards
    .map(
      (c) =>
        `[${c.id}] (${c.domain})${c.myth ? " [COMMON MISCONCEPTION]" : ""} ${c.title}\n    ${c.plain}`,
    )
    .join("\n\n");

  // If the deterministic screen already fired, the model is told — so its framing
  // matches where the person is actually being sent, rather than cheerfully answering
  // a diet question while the rule engine routes them to an emergency department.
  const flagged = screen.flags.length
    ? `\n\nA SAFETY RULE HAS ALREADY FIRED on this question, and it will route this person to ${screen.floor} no matter what you return:\n${screen.flags
        .map((f) => `  - ${f.catches}\n    Why: ${f.why}`)
        .join("\n")}\nWrite your framing accordingly: address the urgent thing first and plainly. Do not soften it, do not bury it under lifestyle advice, and do not contradict it. You may still cite cards if they are genuinely relevant to what happens after they are seen.`
    : "";

  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: ANSWER_SCHEMA },
    },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `This person's focus: ${conditionLabel}

They asked:
"""
${question}
"""

EXPLAIN-TIER CARDS — the ONLY things you may cite. Every medical claim in your framing must come from one of them (put the ones you use in evidenceIds):

${cardList}

NAVIGATE-TIER DIRECTORY — places you may point to (put the relevant ones in pointerIds), but never a source of a medical claim:

${directory}${flagged}`,
      },
    ],
  });

  return firstJson(message);
}
