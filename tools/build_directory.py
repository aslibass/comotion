#!/usr/bin/env python3
"""
build_directory.py — turn data/catalogue.json into data/directory.json for the app.

This is the NAVIGATE-TIER of the two-tier library: every resource as a browsable
directory entry (title, url, domains, subdomains, description, language tags, linked
files), grouped under the eight canonical domains. The model may route someone to these
and describe what they are, but may NOT make a clinical claim from one — that is the
explain-tier (the curated cards in server/evidence.js).

Derived data only: safe to commit. Run after fetch_resources.py.
  python tools/build_directory.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"

# The eight canonical domains, in the order the design team listed them. Each `match`
# is a lowercased fragment used to map the sheet's (inconsistently-cased) domain strings.
DOMAINS = [
    ("understanding", "Understanding my condition"),
    ("symptoms", "Managing symptoms"),
    ("wellbeing", "Improving my health & wellbeing"),
    ("self-management", "Practical self-management"),
    ("services", "Finding services & support"),
    ("programs", "Programs, apps & community"),
    ("appointments", "Preparing for appointments"),
    ("language", "Information in my language"),
]
DOMAIN_MATCH = {
    "understanding": "understanding my condition",
    "symptoms": "managing symptoms",
    "wellbeing": "improving my health",
    "self-management": "practical self",
    "services": "finding services",
    "programs": "programs apps",
    "appointments": "preparing for healthcare",
    "language": "information in my language",
}
LANGUAGES = ("arabic", "vietnamese", "assyrian", "chinese")


def domain_key(label: str) -> str | None:
    low = label.lower()
    for key, frag in DOMAIN_MATCH.items():
        if frag in low:
            return key
    return None


def title_for(r: dict) -> str:
    x = r.get("extract", {})
    if x.get("title"):
        return x["title"].strip()
    if r.get("authors"):
        return r["authors"][0]
    host = re.sub(r"^https?://(www\.)?", "", r["url"]).split("/")[0]
    return host


def description_for(r: dict) -> str:
    if r.get("descriptions"):
        # The sheet's own description wins; collapse whitespace.
        return re.sub(r"\s+", " ", r["descriptions"][0]).strip()
    exc = r.get("extract", {}).get("excerpt", "")
    return re.sub(r"\s+", " ", exc).strip()


def languages_for(r: dict) -> list[str]:
    langs = set()
    for s in r.get("subdomains", []):
        for lang in LANGUAGES:
            if lang in s.lower():
                langs.add(lang.capitalize())
    return sorted(langs)


def main():
    cat = json.loads((DATA / "catalogue.json").read_text(encoding="utf-8"))
    order = [k for k, _ in DOMAINS]
    entries = []
    for r in cat["resources"]:
        # Use the exact "Domain > Subdomain" pairs so each subdomain is tied to its own
        # domain, instead of flattening every subdomain across every domain the resource
        # touches.
        tags: dict[str, list[str]] = {}
        for pair in r.get("domain_subdomain_pairs", []):
            dom, _, sub = pair.partition(" > ")
            key = domain_key(dom)
            if not key:
                continue
            tags.setdefault(key, [])
            sub = sub.strip()
            if sub and sub not in tags[key] and sub.lower() not in ("all subdomains",):
                tags[key].append(sub)
        if not tags:
            continue
        x = r.get("extract", {})
        entries.append({
            "id": r["id"],
            "title": title_for(r),
            "url": r["url"],
            "domains": sorted(tags.keys(), key=order.index),
            "tags": tags,  # {domain_key: [subdomains in that domain]}
            "description": description_for(r),
            "audiences": r.get("audiences", []),
            "languages": languages_for(r),
            "translated": any("translated" in s.lower() or "culturally adapted" in s.lower()
                              for s in r.get("subdomains", [])),
            "doc_links": x.get("doc_links", [])[:10],
            "page_date": x.get("page_date", ""),
            "has_content": x.get("text_chars", 0) >= 400,
        })

    langLabels = [l.capitalize() for l in LANGUAGES]

    def lang_counts(members):
        # How many of these resources are tagged in each language, plus a "translated"
        # tally (generic translated/culturally-adapted versions).
        c = {l: sum(1 for e in members if l in e["languages"]) for l in langLabels}
        c["translated"] = sum(1 for e in members if e["translated"])
        return c

    # Group into the eight domains, with the subdomains actually tagged within each.
    domains = []
    for key, label in DOMAINS:
        members = [e for e in entries if key in e["tags"]]
        subs = []
        for e in members:
            for s in e["tags"][key]:
                if s not in subs:
                    subs.append(s)
        domains.append({"key": key, "label": label, "count": len(members),
                        "subdomains": sorted(subs), "languageCounts": lang_counts(members)})

    out = {
        "generated_at": cat["generated_at"],
        "resource_count": len(entries),
        "languages": langLabels,
        "languageCounts": lang_counts(entries),
        "domains": domains,
        "resources": sorted(entries, key=lambda e: e["title"].lower()),
    }
    (DATA / "directory.json").write_text(json.dumps(out, ensure_ascii=False, indent=2),
                                         encoding="utf-8")
    print(f"Wrote {DATA/'directory.json'}: {len(entries)} resources across {len(domains)} domains")
    for d in domains:
        print(f"  {d['count']:3}  {d['label']}  ({len(d['subdomains'])} subdomains)")


if __name__ == "__main__":
    main()
