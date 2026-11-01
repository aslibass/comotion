#!/usr/bin/env python3
"""
make_handoff.py — turn data/catalogue.json into a team-facing hand-off list.

Classifies every resource by how (or whether) we captured it, and produces:
  * data/handoff.md  — readable, action-first: what still needs a manual download
  * data/handoff.csv — the same as a spreadsheet the team can work in

Run after fetch_resources.py:  python tools/make_handoff.py
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
MIN_TEXT = 400


def classify(r: dict) -> tuple[str, str]:
    """Return (status_label, action) for one resource."""
    f = r.get("fetch", {})
    x = r.get("extract", {})
    method = f.get("method", "")
    chars = x.get("text_chars", 0)
    if f.get("is_pdf"):
        return "PDF", "Download the PDF manually"
    if f.get("status") not in ("ok", "cached"):
        reason = f.get("error") or f"HTTP {f.get('http_status')}"
        return "FAILED", f"Manual download needed ({str(reason)[:60]})"
    if chars < MIN_TEXT:
        return "THIN", "Loaded, but little text — check the page manually"
    if method == "rendered":
        return "OK (rendered)", "Captured via browser render — no action"
    return "OK", "Captured automatically — no action"


def main():
    cat = json.loads((DATA / "catalogue.json").read_text(encoding="utf-8"))
    rows = []
    for r in cat["resources"]:
        label, action = classify(r)
        f, x = r.get("fetch", {}), r.get("extract", {})
        rows.append({
            "status": label,
            "action": action,
            "url": r["url"],
            "author": (r["authors"][0] if r["authors"] else ""),
            "domains": "; ".join(r["domains"]),
            "method": f.get("method", ""),
            "text_chars": x.get("text_chars", 0),
            "page_date": x.get("page_date", ""),
            "language": x.get("language", ""),
            "linked_files": len(x.get("doc_links", [])),
            "has_description": "yes" if r["descriptions"] else "no",
        })

    order = {"FAILED": 0, "PDF": 1, "THIN": 2, "OK (rendered)": 3, "OK": 4}
    rows.sort(key=lambda d: (order.get(d["status"], 9), d["url"]))

    # CSV
    with (DATA / "handoff.csv").open("w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    # Markdown
    def group(label):
        return [d for d in rows if d["status"] == label]

    needs_manual = group("FAILED") + group("PDF") + group("THIN")
    translated = [d for d in rows if d["linked_files"] > 0]

    out = []
    A = out.append
    A("# CoMotion resources — team hand-off list\n")
    A(f"Generated from `catalogue.json` ({cat['generated_at']}). "
      f"{len(rows)} unique resources.\n")
    A("## Summary\n")
    for label in ("OK", "OK (rendered)", "THIN", "PDF", "FAILED"):
        A(f"- **{label}**: {len(group(label))}")
    A(f"- **Pages linking translated/downloadable files**: {len(translated)}\n")

    A("## ⚠️ Still need a manual download / check\n")
    A("These did not yield usable text automatically. "
      "Everything else was captured and needs no action.\n")
    A("| Status | Resource | Why | Domains |")
    A("| --- | --- | --- | --- |")
    for d in needs_manual:
        A(f"| {d['status']} | [{d['author'] or d['url']}]({d['url']}) | {d['action']} | {d['domains'][:50]} |")

    A("\n## In-language material to grab (linked files)\n")
    A("Pages whose actual translated content is a linked PDF/download — "
      "grab the file for the Arabic/Vietnamese/other-language library.\n")
    A("| Resource | Linked files | Domains |")
    A("| --- | --- | --- |")
    for d in sorted(translated, key=lambda x: -x["linked_files"]):
        A(f"| [{d['author'] or d['url']}]({d['url']}) | {d['linked_files']} | {d['domains'][:50]} |")

    A("\n## Captured automatically (no action needed)\n")
    A("| Resource | How | Chars | Page date | Lang | Desc? |")
    A("| --- | --- | --- | --- | --- | --- |")
    for d in group("OK") + group("OK (rendered)"):
        A(f"| [{d['author'] or d['url']}]({d['url']}) | {d['method'] or 'requests'} | "
          f"{d['text_chars']} | {d['page_date']} | {d['language']} | {d['has_description']} |")

    (DATA / "handoff.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"Wrote {DATA/'handoff.md'} and {DATA/'handoff.csv'}")
    print("  " + "  ".join(f"{k}={len(group(k))}" for k in ("OK", "OK (rendered)", "THIN", "PDF", "FAILED")))
    print(f"  needs-manual={len(needs_manual)}  translated-file-pages={len(translated)}")

    write_manual_list(cat, group("FAILED"), group("THIN"))


def write_manual_list(cat, failed_pages, thin_pages):
    """A focused list for students: pages and files we could not fetch automatically."""
    manifest_path = DATA / "files" / "manifest.json"
    bad_files = []
    if manifest_path.exists():
        man = json.loads(manifest_path.read_text(encoding="utf-8"))
        bad_files = [m for m in man["files"] if m["status"] not in ("ok", "cached")]

    out = []
    A = out.append
    A("# CoMotion — manual downloads for the student team\n")
    A("These are the only items we could **not** capture automatically. "
      "Everything else is already in `data/`. For each one: open it in a normal browser, "
      "save the page or file, and drop it in `data/manual/` with the source URL noted.\n")

    A(f"## 1. Pages that are bot-blocked ({len(failed_pages)})\n")
    A("These sites refuse automated requests but open fine in a browser. "
      "Save the page (or its key PDFs).\n")
    A("| Resource | URL | Domains |")
    A("| --- | --- | --- |")
    for d in failed_pages:
        A(f"| {d['author'] or '—'} | {d['url']} | {d['domains'][:50]} |")

    A(f"\n## 2. Linked files that would not download ({len(bad_files)})\n")
    A("Mostly bot-blocked PDFs (e.g. ACI's `__data/assets` server). "
      "Open each in a browser and save the PDF. **Language** column flags in-language material.\n")
    A("| File URL | Language | From page |")
    A("| --- | --- | --- |")
    for m in sorted(bad_files, key=lambda x: x["file_url"]):
        src = m["source_pages"][0] if m["source_pages"] else ""
        A(f"| {m['file_url']} | {m['language_hint'] or ''} | {src[:48]} |")

    A(f"\n## 3. Thin pages worth a human look ({len(thin_pages)})\n")
    A("These loaded but held little text — many are service directories or interactive tools "
      "(fine as link targets, no download needed). Check only the in-language ones for linked files.\n")
    A("| Resource | URL | Domains |")
    A("| --- | --- | --- |")
    for d in thin_pages:
        A(f"| {d['author'] or '—'} | {d['url']} | {d['domains'][:50]} |")

    (DATA / "manual_downloads.md").write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"Wrote {DATA/'manual_downloads.md'}  (bot-blocked pages={len(failed_pages)}, "
          f"failed files={len(bad_files)}, thin={len(thin_pages)})")


if __name__ == "__main__":
    main()
