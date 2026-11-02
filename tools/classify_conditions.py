#!/usr/bin/env python3
"""
classify_conditions.py — tag each resource with the condition(s) it is actually about.

Why this exists: the design team's Layer 2 browses "Understanding my condition" by
condition (Osteoarthritis, Osteoporosis, Persistent Pain, Back Pain), but the source
spreadsheet only has generic sub-domains. This adds the missing classification — and
grounds every tag in text we fetched from the live page, so a human can check it.

Rules (deterministic, re-runnable, no model):
  * primary    — a condition term appears in the page title, URL or the listed description.
  * mentioned  — body text only, and at least MENTION_MIN occurrences. Shown, but ranked lower.
  * Nothing else is tagged. A page whose fetch failed is classified from title/URL/description
    only and marked verified=false.
Every tag carries a verbatim quote from the page (or the listing) as evidence.

Usage:
  python tools/classify_conditions.py                       # write data/conditions.json
  python tools/classify_conditions.py --xlsx "<path.xlsx>"  # also add two columns to the Website sheet
"""
import argparse
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
MENTION_MIN = 3

# label -> regex. Deliberately conservative: "arthritis" alone is NOT osteoarthritis, and
# "pain" alone is NOT persistent pain.
CONDITIONS = {
    "Osteoarthritis": r"osteo-?arthritis|degenerative (?:joint|arthritis)",
    "Osteoporosis": r"osteoporosis|osteopenia|bone density|fragility fracture",
    "Persistent Pain": r"persistent\s?pain|chronic\s?(?:musculoskeletal\s?|non-?cancer\s?)?pain|long[- ]term pain",
    "Back Pain": r"back pain|low(?:er)? back|backache|spinal pain|lumbar|sciatica",
}
COMPILED = {k: re.compile(v, re.I) for k, v in CONDITIONS.items()}


def sentence_around(text: str, m: re.Match, width: int = 110) -> str:
    a, b = max(0, m.start() - width), min(len(text), m.end() + width)
    s = re.sub(r"\s+", " ", text[a:b]).strip()
    return ("…" if a else "") + s + ("…" if b < len(text) else "")


def classify(r: dict, body: str) -> dict:
    title = ((r.get("extract") or {}).get("title") or "")
    url = r.get("url") or ""
    desc = " ".join(r.get("descriptions") or [])
    fetch_ok = (r.get("fetch") or {}).get("status") == "ok" and bool(body.strip())
    authors = " ".join(r.get("authors") or [])
    tags = []
    for label, rx in COMPILED.items():
        primary_src = None
        for src_name, src in (("page title", title), ("web address", url),
                              ("listing author", authors), ("listing description", desc)):
            m = rx.search(src)
            if m:
                primary_src = (src_name, sentence_around(src, m, 80))
                break
        body_hits = list(rx.finditer(body))
        if primary_src:
            # The page's own title/address vouches for itself. A tag that rests only on the
            # spreadsheet's listing, with a fetched page that never mentions it, is NOT confirmed.
            listing_only = (primary_src[0] in ("listing author", "listing description")
                            and fetch_ok and not body_hits)
            tags.append({"condition": label, "strength": "listing-only" if listing_only else "primary",
                         "found_in": primary_src[0], "quote": primary_src[1],
                         "body_mentions": len(body_hits)})
        elif len(body_hits) >= MENTION_MIN:
            tags.append({"condition": label, "strength": "mentioned", "found_in": "page text",
                         "quote": sentence_around(body, body_hits[0]), "body_mentions": len(body_hits)})
    # `conditions` = the confirmed ones only. listing-only tags stay in `tags` as a note.
    return {"conditions": [t["condition"] for t in tags if t["strength"] != "listing-only"], "tags": tags,
            "verified": fetch_ok, "checked_against": url if fetch_ok else None}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", help="Add 'Condition(s)' + 'Condition evidence' columns to this workbook (a backup is made first).")
    args = ap.parse_args()

    cat = json.loads((DATA / "catalogue.json").read_text(encoding="utf-8"))
    out, counts, unverified = {}, {k: {"primary": 0, "mentioned": 0, "listing-only": 0} for k in CONDITIONS}, 0
    ov_file = DATA / "conditions_overrides.json"
    ov = json.loads(ov_file.read_text(encoding="utf-8")) if ov_file.exists() else {"by_url": {}}
    for r in cat["resources"]:
        tp = DATA / "text" / f"{r['id']}.txt"
        body = tp.read_text(encoding="utf-8", errors="replace") if tp.exists() else ""
        c = classify(r, body)
        if r["url"] in ov["by_url"]:  # checked against the live site by hand — wins over the automatic tags
            tags = [{"condition": t["condition"], "strength": "primary", "found_in": f"live site check {ov['checked_on']}",
                     "quote": t["quote"], "body_mentions": None} for t in ov["by_url"][r["url"]]]
            c = {"conditions": [t["condition"] for t in tags], "tags": tags, "verified": True, "checked_against": r["url"]}
        out[r["id"]] = {"url": r["url"], "url_as_listed": r.get("url_as_listed"), **c}
        unverified += 0 if c["verified"] else 1
        for t in c["tags"]:
            counts[t["condition"]][t["strength"]] += 1

    (DATA / "conditions.json").write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "method": f"primary = in title/URL/listing description; mentioned = body only, >= {MENTION_MIN} occurrences",
        "conditions": list(CONDITIONS), "by_id": out}, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"Classified {len(out)} resources ({unverified} could not be checked against fetched page text)")
    for k, v in counts.items():
        print(f"  {k:16} primary {v['primary']:3}   mentioned {v['mentioned']:3}")

    if args.xlsx:
        import openpyxl
        p = Path(args.xlsx)
        backup = p.with_name(p.stem + "_BACKUP_before_conditions" + p.suffix)
        if not backup.exists():
            shutil.copy2(p, backup)
            print(f"Backup: {backup}")
        wb = openpyxl.load_workbook(p)
        ws = wb["Website"]
        by_listed = {}
        for rec in out.values():
            for u in {rec["url_as_listed"], rec["url"]}:
                if u:
                    by_listed[u.strip()] = rec
        hdr = [c.value for c in ws[1]]
        if "Condition(s)" in hdr:  # re-run: overwrite our own columns instead of appending more
            col_c = hdr.index("Condition(s)") + 1
            col_e = hdr.index("Condition evidence") + 1
        else:
            col_c, col_e = len(hdr) + 1, len(hdr) + 2
        ws.cell(1, col_c, "Condition(s)")
        ws.cell(1, col_e, "Condition evidence")
        for cell in (ws.cell(1, col_c), ws.cell(1, col_e)):
            src = ws.cell(1, 1)
            cell.font, cell.fill, cell.alignment, cell.border = src.font.copy(), src.fill.copy(), src.alignment.copy(), src.border.copy()
        ws.column_dimensions[ws.cell(1, col_c).column_letter].width = 28
        ws.column_dimensions[ws.cell(1, col_e).column_letter].width = 90
        miss = 0
        for row in range(2, ws.max_row + 1):
            u = ws.cell(row, 2).value
            rec = by_listed.get(str(u).strip()) if u else None
            if not rec:
                miss += 1 if u else 0
                continue
            ws.cell(row, col_c, ", ".join(rec["conditions"]) or "General / none specific")
            ev = "; ".join(
                (f"NOT CONFIRMED – listing says {t['condition']} but the fetched page does not mention it: “{t['quote']}”"
                 if t["strength"] == "listing-only" else
                 f"{t['condition']} [{t['strength']}, {t['found_in']}]: “{t['quote']}”")
                for t in rec["tags"])
            if not rec["verified"]:
                ev = (ev + " " if ev else "") + "(page could not be fetched — unverified)"
            ws.cell(row, col_e, ev or "No condition named in title, address, description or page text.")
        wb.save(p)
        print(f"Wrote columns to {p.name} ({miss} rows had no matching URL)")


if __name__ == "__main__":
    sys.exit(main())
