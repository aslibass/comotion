#!/usr/bin/env python3
"""
fetch_resources.py — build CoMotion's resource corpus from the repository spreadsheet.

Reads the "Website" sheet of the CoMotion resource repository (one row per
domain/subdomain a resource is tagged to), de-duplicates to one record per unique
URL, fetches each page, and extracts clean main-text + metadata (title, published
date, language) with trafilatura.

It is idempotent and re-runnable:
  * raw HTML is cached under data/raw/<id>.html and reused unless stale or --force
  * every run rewrites data/catalogue.json and data/fetch_report.md from the cache
so you can re-run after fixing the sheet, add --force to refetch, or --only to target
a subset, without re-downloading everything.

The extracted text feeds the two-tier corpus:
  * descriptions for the ~70 rows that have none (so every resource is routable)
  * verbatim-quote "explain tier" cards for the curated subset (where page text earns its keep)

Fetched page content is untrusted web data: this script only extracts and stores text,
it never executes it. Nothing here auto-promotes into the live library — that stays a
human curation step.

Usage:
  python tools/fetch_resources.py                      # default xlsx in ~/Downloads, output to data/
  python tools/fetch_resources.py --xlsx PATH --out DIR
  python tools/fetch_resources.py --force              # ignore cache, refetch all
  python tools/fetch_resources.py --limit 10           # fetch only first 10 (smoke test)
  python tools/fetch_resources.py --only aci.health    # only URLs containing this substring
  python tools/fetch_resources.py --max-age-days 14    # refetch anything cached longer ago than this
  python tools/fetch_resources.py --no-render          # skip the headless-Chromium fallback

Failed GETs (403 bot-blocks, connection resets) and JS-rendered pages that a plain request can't
read are retried with a headless Chromium (Playwright), which recovers the great majority of them.

Requires: openpyxl, requests, trafilatura. Optional (render fallback): playwright + chromium
  (python -m pip install playwright && python -m playwright install chromium).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

DEFAULT_XLSX = Path.home() / "Downloads" / "CoMotion_Resource_Repository_Domains_Subdomains_Description_SB.xlsx"
SHEET = "Website"
# A clean, current browser UA. The earlier version carried a "CoMotion-ResourceFetcher"
# token, which several sites (ACI, arthritis.org.au, SA Health) 403'd on sight.
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
REQUEST_TIMEOUT = (10, 45)  # (connect, read) — gov.au sites are slow
POLITE_DELAY_S = 1.0        # between network fetches (cache hits are free)
MIN_TEXT = 400              # below this a page is treated as "thin" and retried with a render
# Links to the actual translated / downloadable content we want to keep as metadata.
DOC_LINK_RE = re.compile(r"""href=['"]([^'"]+(?:\.pdf|\.docx?|@@download/file|/download)[^'"]*)['"]""", re.I)


# ----------------------------------------------------------------------------- xlsx

def norm_ws(s) -> str:
    """Collapse whitespace and non-breaking spaces; return a clean string."""
    if s is None:
        return ""
    return re.sub(r"\s+", " ", str(s).replace("\xa0", " ")).strip()


def repair_url(raw: str) -> str:
    """Fix common data-entry errors in the sheet before normalising: typo'd schemes
    (htttps, htps), an accidental doubled scheme, and a missing scheme (default https)."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    # accidental doubled scheme: http://https://host -> https://host
    raw = re.sub(r"^https?://(?=https?://)", "", raw, flags=re.I)
    # typo'd scheme: htttps:// / htps:// / htttp:// -> normalise to http(s)
    m = re.match(r"^(h[t]{1,4}ps?)://(.*)$", raw, re.I)
    if m:
        scheme = "https" if m.group(1).lower().endswith("s") else "http"
        raw = f"{scheme}://{m.group(2)}"
    elif not re.match(r"^https?://", raw, re.I):
        raw = "https://" + raw
    return raw


def normalize_url(raw: str) -> str:
    """Canonical form for de-duplication: lowercase scheme+host, drop fragment,
    strip a trailing slash from non-root paths. Query is kept (apps use it)."""
    raw = repair_url(raw)
    if not raw:
        return ""
    parts = urlsplit(raw)
    scheme = parts.scheme.lower()
    netloc = parts.netloc.lower()
    path = parts.path
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    return urlunsplit((scheme, netloc, path, parts.query, ""))


def slug_id(url: str) -> str:
    host = urlsplit(url).netloc.lower().replace("www.", "")
    host_slug = re.sub(r"[^a-z0-9]+", "-", host).strip("-")[:40]
    h = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    return f"{host_slug}__{h}"


def load_repository(xlsx_path: Path) -> list[dict]:
    """De-duplicate the sheet to one record per unique URL, collecting the domains,
    subdomains, authors, descriptions and audiences it was tagged with."""
    from openpyxl import load_workbook

    wb = load_workbook(xlsx_path, data_only=True, read_only=True)
    if SHEET not in wb.sheetnames:
        sys.exit(f"Sheet '{SHEET}' not found. Sheets: {wb.sheetnames}")
    ws = wb[SHEET]
    rows = ws.iter_rows(values_only=True)
    header = [norm_ws(c) for c in next(rows)]
    # Expected: Author, Website, Domain, Sub-Domain, Description, User, User
    idx = {name: i for i, name in enumerate(header)}
    i_author = idx.get("Author", 0)
    i_url = idx.get("Website", 1)
    i_domain = idx.get("Domain", 2)
    i_sub = idx.get("Sub-Domain", 3)
    i_desc = idx.get("Description", 4)
    user_cols = [i for i, n in enumerate(header) if n == "User"] or [5, 6]

    by_url: dict[str, dict] = {}
    skipped_no_url = 0
    for r in rows:
        if r is None or not any(c is not None for c in r):
            continue
        url_raw = norm_ws(r[i_url]) if i_url < len(r) else ""
        if not url_raw:
            skipped_no_url += 1
            continue
        key = normalize_url(url_raw)
        rec = by_url.setdefault(key, {
            "id": slug_id(key),
            "url": key,
            "url_as_listed": url_raw,
            "url_repaired": not re.match(r"^https?://", url_raw, re.I) or re.match(r"^https?://https?://", url_raw, re.I) is not None,
            "authors": [],
            "domains": [],
            "subdomains": [],
            "domain_subdomain_pairs": [],
            "descriptions": [],
            "audiences": [],
            "source_row_count": 0,
        })
        rec["source_row_count"] += 1
        for col, field in ((i_author, "authors"), (i_domain, "domains"), (i_sub, "subdomains")):
            v = norm_ws(r[col]) if col < len(r) else ""
            if v and v not in rec[field]:
                rec[field].append(v)
        dom = norm_ws(r[i_domain]) if i_domain < len(r) else ""
        sub = norm_ws(r[i_sub]) if i_sub < len(r) else ""
        pair = f"{dom} > {sub}" if sub else dom
        if pair and pair not in rec["domain_subdomain_pairs"]:
            rec["domain_subdomain_pairs"].append(pair)
        desc = norm_ws(r[i_desc]) if i_desc < len(r) else ""
        if desc and desc not in rec["descriptions"]:
            rec["descriptions"].append(desc)
        for uc in user_cols:
            v = norm_ws(r[uc]) if uc < len(r) else ""
            if v and v not in rec["audiences"]:
                rec["audiences"].append(v)

    records = sorted(by_url.values(), key=lambda x: x["url"])
    print(f"Loaded {sum(r['source_row_count'] for r in records)} rows "
          f"({skipped_no_url} without a URL skipped) -> {len(records)} unique resources")
    return records


# ----------------------------------------------------------------------------- fetch

def make_session():
    import requests
    from requests.adapters import HTTPAdapter
    try:
        from urllib3.util.retry import Retry
    except Exception:
        from requests.packages.urllib3.util.retry import Retry  # type: ignore
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT,
                      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                      "Accept-Language": "en-AU,en;q=0.9"})
    retry = Retry(total=2, connect=2, read=2, backoff_factor=1.0,
                  status_forcelist=(429, 500, 502, 503, 504),
                  allowed_methods=frozenset({"GET"}))
    adapter = HTTPAdapter(max_retries=retry)
    s.mount("http://", adapter)
    s.mount("https://", adapter)
    return s


def cache_path(out_dir: Path, rec: dict) -> Path:
    return out_dir / "raw" / f"{rec['id']}.html"


def is_fresh(path: Path, max_age_days: float | None) -> bool:
    if not path.exists() or path.stat().st_size == 0:
        return False
    if max_age_days is None:
        return True
    age_days = (time.time() - path.stat().st_mtime) / 86400.0
    return age_days <= max_age_days


def fetch_one(session, rec: dict, out_dir: Path, force: bool, max_age_days):
    """Fetch (or load from cache) and record HTTP outcome on rec. Returns html|None."""
    raw = cache_path(out_dir, rec)
    raw.parent.mkdir(parents=True, exist_ok=True)
    if not force and is_fresh(raw, max_age_days):
        rec["fetch"] = {"status": "cached", "http_status": None,
                        "final_url": rec["url"], "fetched_at": _iso(raw.stat().st_mtime)}
        try:
            return raw.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            rec["fetch"]["status"] = f"cache_read_error: {e}"
            return None

    import requests
    try:
        resp = session.get(rec["url"], timeout=REQUEST_TIMEOUT, allow_redirects=True)
        ctype = resp.headers.get("Content-Type", "")
        rec["fetch"] = {
            "status": "ok" if resp.ok else "http_error",
            "http_status": resp.status_code,
            "final_url": resp.url,
            "content_type": ctype,
            "method": "requests",
            "fetched_at": _iso(time.time()),
        }
        if "application/pdf" in ctype.lower() or rec["url"].lower().endswith(".pdf"):
            # A PDF, not a web page: resp.text is binary garbage. Flag it; don't extract here.
            rec["fetch"]["is_pdf"] = True
            time.sleep(POLITE_DELAY_S)
            return None
        html = resp.text  # requests picks encoding; good enough for extraction
        if resp.ok and html:
            raw.write_text(html, encoding="utf-8", errors="replace")
        time.sleep(POLITE_DELAY_S)
        return html if resp.ok else None
    except requests.exceptions.RequestException as e:
        rec["fetch"] = {"status": "error", "http_status": None,
                        "final_url": rec["url"], "error": f"{type(e).__name__}: {e}",
                        "fetched_at": _iso(time.time())}
        time.sleep(POLITE_DELAY_S)
        return None


def _iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(timespec="seconds")


class Renderer:
    """Headless-Chromium fallback for pages a plain GET can't read: ones that 403 a
    non-browser client (ACI, arthritis.org.au), reset the connection, or render their
    content with JavaScript (Black Dog). One browser is launched lazily and reused."""

    def __init__(self):
        self._pw = None
        self._browser = None
        self.available = True
        try:
            import playwright  # noqa: F401
        except Exception:
            self.available = False

    def html(self, url: str):
        from playwright.sync_api import sync_playwright
        if self._browser is None:
            self._pw = sync_playwright().start()
            self._browser = self._pw.chromium.launch(headless=True)
        ctx = self._browser.new_context(user_agent=USER_AGENT, locale="en-AU")
        page = ctx.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            try:
                page.wait_for_load_state("networkidle", timeout=8000)
            except Exception:
                pass
            return page.content(), page.url
        finally:
            ctx.close()

    def close(self):
        try:
            if self._browser:
                self._browser.close()
            if self._pw:
                self._pw.stop()
        except Exception:
            pass


# ----------------------------------------------------------------------------- extract

def extract(rec: dict, html: str | None, out_dir: Path):
    rec["extract"] = {"text_chars": 0, "title": "", "page_date": "",
                      "language": "", "excerpt": "", "text_file": "", "doc_links": []}
    if not html:
        return
    from urllib.parse import urljoin
    import trafilatura
    from trafilatura.metadata import extract_metadata

    # Capture links to downloadable / translated content (the real in-language material
    # often lives in a linked PDF, e.g. MHCS's "@@download/file" translations).
    doc_links = list(dict.fromkeys(
        urljoin(rec["fetch"].get("final_url", rec["url"]), m) for m in DOC_LINK_RE.findall(html)))
    rec["extract"]["doc_links"] = doc_links[:15]

    text = None
    try:
        text = trafilatura.extract(
            html, url=rec["url"], favor_recall=True,
            include_comments=False, include_tables=True, no_fallback=False,
        )
    except Exception as e:
        rec["extract"]["error"] = f"extract: {type(e).__name__}: {e}"

    meta = {}
    try:
        md = extract_metadata(html, default_url=rec["url"])
        if md:
            meta = md.as_dict() if hasattr(md, "as_dict") else dict(md.__dict__)
    except Exception:
        pass

    # language fallback from <html lang="..">
    lang = (meta.get("language") or "") if isinstance(meta, dict) else ""
    if not lang:
        m = re.search(r"<html[^>]*\blang=['\"]([a-zA-Z-]+)", html[:4000])
        if m:
            lang = m.group(1)

    if text:
        text = text.strip()
        tf = out_dir / "text" / f"{rec['id']}.txt"
        tf.parent.mkdir(parents=True, exist_ok=True)
        tf.write_text(text, encoding="utf-8")
        rec["extract"].update({
            "text_chars": len(text),
            "title": (meta.get("title") if isinstance(meta, dict) else "") or "",
            "page_date": (meta.get("date") if isinstance(meta, dict) else "") or "",
            "language": lang or "",
            "excerpt": re.sub(r"\s+", " ", text)[:300],
            "text_file": str(tf.relative_to(out_dir)).replace("\\", "/"),
        })


# ----------------------------------------------------------------------------- report

def write_outputs(records: list[dict], out_dir: Path, xlsx_path: Path):
    catalogue = {
        "generated_at": _iso(time.time()),
        "source_xlsx": str(xlsx_path),
        "resource_count": len(records),
        "resources": records,
    }
    (out_dir / "catalogue.json").write_text(
        json.dumps(catalogue, ensure_ascii=False, indent=2), encoding="utf-8")

    n = len(records)
    ok = [r for r in records if r.get("fetch", {}).get("status") in ("ok", "cached")]
    failed = [r for r in records if r not in ok]
    rendered = [r for r in records if r.get("fetch", {}).get("method") == "rendered"]
    pdfs = [r for r in records if r.get("fetch", {}).get("is_pdf")]
    with_text = [r for r in ok if r.get("extract", {}).get("text_chars", 0) >= MIN_TEXT]
    with_doclinks = [r for r in records if r.get("extract", {}).get("doc_links")]
    no_desc = [r for r in records if not r["descriptions"]]
    dated = [r for r in ok if r.get("extract", {}).get("page_date")]
    langs: dict[str, int] = {}
    for r in ok:
        lang = (r.get("extract", {}).get("language") or "?").split("-")[0]
        langs[lang] = langs.get(lang, 0) + 1

    lines = []
    L = lines.append
    L(f"# CoMotion resource fetch report\n")
    L(f"Generated {catalogue['generated_at']}  ·  source: `{xlsx_path.name}`\n")
    L(f"- Unique resources: **{n}**")
    L(f"- Fetched or cached OK: **{len(ok)}**  (of which {len(rendered)} needed the headless render)")
    L(f"- Fetch failed: **{len(failed)}**")
    L(f"- PDFs (flagged, not text-extracted here): **{len(pdfs)}**")
    L(f"- With usable extracted text (>={MIN_TEXT} chars, explain-tier candidates): **{len(with_text)}**")
    L(f"- Pages linking downloadable/translated docs (PDF/@@download): **{len(with_doclinks)}**")
    L(f"- Rows still missing a description in the sheet: **{len(no_desc)}**")
    L(f"- Pages exposing a published/updated date: **{len(dated)}**")
    L(f"- Detected page language (count): " +
      ", ".join(f"{k}={v}" for k, v in sorted(langs.items(), key=lambda x: -x[1])))
    if failed:
        L("\n## Fetch failures (recheck these)\n")
        for r in failed:
            f = r.get("fetch", {})
            L(f"- `{r['url']}` — {f.get('status')} "
              f"{f.get('http_status') or ''} {f.get('error','')}".rstrip())
    if no_desc:
        L("\n## Resources with no description in the sheet (fill from extracted text)\n")
        for r in no_desc:
            has = r.get("extract", {}).get("text_chars", 0)
            L(f"- `{r['url']}` — extracted {has} chars"
              + (" (no text — needs manual look)" if has < 400 else ""))
    (out_dir / "fetch_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nWrote {out_dir/'catalogue.json'}")
    print(f"Wrote {out_dir/'fetch_report.md'}")
    print(f"  OK {len(ok)}/{n}  ·  with text {len(with_text)}  ·  failed {len(failed)}  ·  no-desc {len(no_desc)}")


# ----------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--xlsx", type=Path, default=DEFAULT_XLSX)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "data")
    ap.add_argument("--force", action="store_true", help="ignore cache, refetch everything")
    ap.add_argument("--max-age-days", type=float, default=None,
                    help="refetch anything cached longer ago than this (default: cache never expires)")
    ap.add_argument("--limit", type=int, default=None, help="process only the first N resources")
    ap.add_argument("--only", type=str, default=None, help="only URLs containing this substring")
    ap.add_argument("--no-render", action="store_true",
                    help="disable the headless-Chromium fallback for failed/thin pages")
    args = ap.parse_args()

    if not args.xlsx.exists():
        sys.exit(f"Spreadsheet not found: {args.xlsx}")
    args.out.mkdir(parents=True, exist_ok=True)

    records = load_repository(args.xlsx)
    if args.only:
        records = [r for r in records if args.only.lower() in r["url"].lower()]
    if args.limit:
        records = records[:args.limit]
    print(f"Processing {len(records)} resources -> {args.out}\n")

    session = make_session()
    renderer = None if args.no_render else Renderer()
    if renderer and not renderer.available:
        print("NOTE: --render requested but the 'playwright' package is unavailable.\n"
              "      Install it with:  python -m pip install playwright && python -m playwright install chromium\n"
              "      Continuing without the render fallback.\n")
        renderer = None

    for i, rec in enumerate(records, 1):
        html = fetch_one(session, rec, args.out, args.force, args.max_age_days)
        extract(rec, html, args.out)
        f = rec.get("fetch", {})
        x = rec.get("extract", {})

        # Render fallback: a failed GET, or a page too thin to be the real content.
        thin = x.get("text_chars", 0) < MIN_TEXT
        failed = f.get("status") in ("error", "http_error")
        if renderer and not f.get("is_pdf") and (failed or (thin and f.get("method") == "requests")):
            try:
                rhtml, final = renderer.html(rec["url"])
                if rhtml:
                    cache_path(args.out, rec).write_text(rhtml, encoding="utf-8", errors="replace")
                    f["status"] = "ok"
                    f["method"] = "rendered"
                    f["final_url"] = final
                    extract(rec, rhtml, args.out)
                    x = rec["extract"]
            except Exception as e:
                f["render_error"] = f"{type(e).__name__}: {e}"

        print(f"[{i:3}/{len(records)}] {f.get('status','?'):7} "
              f"{(f.get('method') or ''):8} "
              f"{x.get('text_chars',0):6}c {(x.get('language') or ''):5} {rec['url'][:66]}")

    if renderer:
        renderer.close()
    if args.only or args.limit:
        # Partial run: merge refreshed fetch/extract results into the existing catalogue
        # instead of overwriting it with just the subset.
        existing = args.out / "catalogue.json"
        if existing.exists():
            full = json.loads(existing.read_text(encoding="utf-8"))["resources"]
            fresh = {r["id"]: r for r in records}
            for old in full:
                if old["id"] in fresh:
                    old["fetch"] = fresh[old["id"]].get("fetch", old.get("fetch"))
                    old["extract"] = fresh[old["id"]].get("extract", old.get("extract"))
            records = full
    write_outputs(records, args.out, args.xlsx)


if __name__ == "__main__":
    main()
