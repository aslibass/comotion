// TRANSLATE — layer 3's "translates, if requested".
//
// The narrowest possible job: take the plain-English explanation the library-grounded
// answer already produced, and put the SAME words into the reader's language. Three rules
// keep it honest, and none of them is a request to the model — they are checks in code:
//
//   1. Only the explanation is translated. The urgency level, the triage questions, the
//      emergency message and the question written for the GP are never touched here — they
//      are fixed human-translated strings or stay in English (a GP reads that one).
//   2. Every number, phone number and drug dose in the English must survive. If any digit
//      sequence differs, the translation is thrown away and the reader gets the English.
//   3. The page labels it a machine translation and offers the English original in one tap.
//
// The translation can still be imperfect in ways code cannot see — that is what the label
// and the English original are for, and why Arabic/Vietnamese stay "unreviewed" until a
// credentialed translator signs off.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-4-8";

// Languages we will translate into. Anything else is ignored (never passed to the model).
export const TRANSLATE_TO = new Set(["Arabic", "Vietnamese"]);

const SYSTEM = `You translate a short health explanation from English into the requested language for a frightened person in pain who reads that language.

Rules:
- Translate faithfully. Do not add, remove, soften, strengthen or reorder any medical claim, instruction or warning. Do not add advice of your own.
- Keep every number, dose, phone number and drug name exactly as written. Drug names, phone numbers and web addresses stay in Latin characters.
- Plain, everyday words a Year 6 reader would understand. Short sentences.
- Output ONLY the translation, with no preface, notes or quotation marks.`;

// Western digits, Arabic-Indic and Extended Arabic-Indic digits all normalise to 0-9.
function normaliseDigits(s) {
  return String(s)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

const digitRuns = (s) => (normaliseDigits(s).match(/\d+/g) || []).sort();

// True only if the two texts contain exactly the same multiset of digit sequences.
export function numbersPreserved(english, translated) {
  const a = digitRuns(english);
  const b = digitRuns(translated);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

let client;
function getClient() {
  client ??= new Anthropic();
  return client;
}

// Returns { language, text } or null. Null always means "show the English" — it is never an error
// the reader sees.
export async function translateFraming(text, language, { create } = {}) {
  if (!text || !TRANSLATE_TO.has(language)) return null;
  try {
    const call = create ?? ((args) => getClient().messages.create(args));
    const message = await call({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: `Translate into ${language}:\n\n${text}` }],
    });
    const out = message.content.find((b) => b.type === "text")?.text?.trim();
    if (!out) return null;
    if (!numbersPreserved(text, out)) {
      console.warn(`translation to ${language} dropped: numbers did not survive`);
      return null;
    }
    return { language, text: out };
  } catch (err) {
    console.warn(`translation to ${language} failed:`, err.message);
    return null;
  }
}
