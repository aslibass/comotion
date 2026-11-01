// THE NAVIGATE TIER.
//
// The 169-resource directory, loaded from data/directory.json (built by
// tools/build_directory.py from the resource repository). This is the long tail: the
// model may ROUTE someone to these and say what they are, but may NOT make a clinical
// claim from one. That line is the explain-tier (server/evidence.js) vs navigate-tier
// split, and it is enforced in index.js — a pointer can never become a cited source.
//
// Pure data. No model. Browsing it needs no API key, exactly like the card library.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let DIRECTORY = { generated_at: null, resource_count: 0, languages: [], domains: [], resources: [] };
try {
  DIRECTORY = JSON.parse(readFileSync(join(__dirname, "../data/directory.json"), "utf8"));
} catch (err) {
  console.warn("directory.json not found — run `python tools/build_directory.py`. Browse will be empty.");
}

export { DIRECTORY };

const BY_ID = new Map(DIRECTORY.resources.map((r) => [r.id, r]));
export const dirById = (id) => BY_ID.get(id);

export const DOMAIN_KEYS = DIRECTORY.domains.map((d) => d.key);
export const domainLabel = (key) => DIRECTORY.domains.find((d) => d.key === key)?.label || key;

// How "in-language" a resource is: 0 = tagged in that exact language, 1 = has translated
// or culturally-adapted versions, 2 = English only. Used to rank and to be honest about
// what actually exists (the sheet tags very few resources by specific language).
function languageRank(r, lang) {
  if (lang && r.languages.some((l) => l.toLowerCase() === lang)) return 0;
  if (r.translated) return 1;
  return 2;
}

export function resourcesForDomain(key, { language } = {}) {
  let list = DIRECTORY.resources.filter((r) => r.domains.includes(key));
  let tagged = list.length;
  if (language) {
    const lang = language.toLowerCase();
    tagged = list.filter((r) => languageRank(r, lang) === 0).length;
    list = [...list].sort((a, b) => languageRank(a, lang) - languageRank(b, lang));
  }
  return { list, tagged };
}

// A compact line per resource for the model to route against (navigate tier only).
export function directoryForModel() {
  return DIRECTORY.resources
    .map((r) => `[${r.id}] (${r.domains.join(", ")}) ${r.title} — ${r.description.slice(0, 160)}`)
    .join("\n");
}
