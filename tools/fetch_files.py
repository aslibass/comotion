#!/usr/bin/env python3
"""
fetch_files.py — download the linked files catalogued by fetch_resources.py.

Reads data/catalogue.json and downloads (a) the resources that are themselves PDFs and
(b) every PDF/@@download link found on the resource pages (the real translated material
often lives in these). Saves them under data/files/ with a manifest that records which
source page each file came from and any language hint.

Idempotent and re-runnable: a file already downloaded is skipped unless --force.

Usage:
  python tools/fetch_files.py
  python tools/fetch_files.py --force
  python tools/fetch_files.py --limit 10
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
from pathlib import Path
from urllib.parse import urlsplit, unquote

DATA = Path(__file__).resolve().parent.parent / "data"
FILES = DATA / "files"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
TIMEOUT = (10, 60)          # PDFs can be large / slow
DELAY_S = 0.6
LANG_WORDS = ("arabic", "vietnamese", "assyrian", "chinese", "translated", "culturally adapted")
MAX_BYTES = 60 * 1024 * 1024


def norm(u: str) -> str:
    return u.split("#")[0].strip()


class PwFetcher:
    """Download a file through Chromium's own network stack (Playwright APIRequestContext),
    which carries a real browser fingerprint and gets past the WAFs that 403 a plain GET
    (e.g. ACI's PDF server)."""

    def __init__(self):
        self._pw = self._br = self._ctx = None
        self.available = True
        try:
            import playwright  # noqa: F401
        except Exception:
            self.available = False

    def get(self, url: str):
        from playwright.sync_api import sync_playwright
        if self._ctx is None:
            self._pw = sync_playwright().start()
            self._br = self._pw.chromium.launch(headless=True)
            self._ctx = self._br.new_context(user_agent=USER_AGENT, locale="en-AU")
        resp = self._ctx.request.get(url, timeout=60000)
        return resp.status, {k.lower(): v for k, v in resp.headers.items()}, resp.body()

    def close(self):
        try:
            if self._br:
                self._br.close()
            if self._pw:
                self._pw.stop()
        except Exception:
            pass


def lang_hint(subdomains) -> str:
    hits = [s for s in subdomains if any(w in s.lower() for w in LANG_WORDS)]
    return "; ".join(sorted(set(hits)))


def _ci(headers: dict, key: str) -> str:
    return headers.get(key) or headers.get(key.lower()) or headers.get(key.title()) or ""


def filename_for(url: str, headers: dict) -> str:
    # Prefer the server's Content-Disposition filename, then the URL basename, then a hash.
    cd = _ci(headers, "Content-Disposition")
    m = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)', cd, re.I)
    name = unquote(m.group(1)) if m else Path(urlsplit(url).path).name
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("_")
    if not name or "." not in name:
        ctype = _ci(headers, "Content-Type").lower()
        ext = ".pdf" if "pdf" in ctype else (".docx" if "word" in ctype else ".bin")
        name = (name or "file") + ext
    h = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    return f"{h}_{name}"[:120]


def is_file_bytes(ctype: str, head: bytes) -> bool:
    if any(t in (ctype or "").lower() for t in ("pdf", "officedocument", "msword", "octet-stream")):
        return True
    return head[:5] == b"%PDF-" or head[:2] == b"PK"  # PDF, or zip-based docx


def gather(cat: dict):
    """file_url -> {source_pages:set, lang:str}."""
    tasks: dict[str, dict] = {}
    for r in cat["resources"]:
        urls = []
        if r.get("fetch", {}).get("is_pdf"):
            urls.append(r["url"])
        urls += [norm(d) for d in r.get("extract", {}).get("doc_links", [])]
        for u in urls:
            t = tasks.setdefault(u, {"source_pages": set(), "lang": ""})
            t["source_pages"].add(r["url"])
            lh = lang_hint(r.get("subdomains", []))
            if lh and lh not in t["lang"]:
                t["lang"] = (t["lang"] + "; " + lh).strip("; ") if t["lang"] else lh
    return tasks


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--no-render", action="store_true",
                    help="disable the Chromium fallback for bot-blocked files")
    args = ap.parse_args()

    import requests
    from requests.adapters import HTTPAdapter
    try:
        from urllib3.util.retry import Retry
    except Exception:
        from requests.packages.urllib3.util.retry import Retry  # type: ignore

    cat = json.loads((DATA / "catalogue.json").read_text(encoding="utf-8"))
    tasks = gather(cat)
    urls = sorted(tasks)
    if args.limit:
        urls = urls[:args.limit]
    FILES.mkdir(parents=True, exist_ok=True)

    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT, "Accept": "*/*", "Accept-Language": "en-AU,en;q=0.9"})
    retry = Retry(total=2, connect=2, read=2, backoff_factor=1.0,
                  status_forcelist=(429, 500, 502, 503, 504), allowed_methods=frozenset({"GET"}))
    s.mount("http://", HTTPAdapter(max_retries=retry))
    s.mount("https://", HTTPAdapter(max_retries=retry))

    pw = None if args.no_render else PwFetcher()
    if pw and not pw.available:
        print("NOTE: playwright unavailable; bot-blocked files will not be recovered.\n")
        pw = None

    manifest = []
    ok = skip = fail = rendered = 0
    print(f"Downloading {len(urls)} unique files -> {FILES}\n")
    for i, u in enumerate(urls, 1):
        meta = tasks[u]
        rec = {"file_url": u, "source_pages": sorted(meta["source_pages"]),
               "language_hint": meta["lang"], "local_path": "", "status": "", "method": "",
               "bytes": 0, "content_type": ""}
        saved = cached = False
        why = None  # the requests-path failure reason, if any

        # 1) plain requests
        try:
            resp = s.get(u, timeout=TIMEOUT, allow_redirects=True, stream=True)
            ctype = resp.headers.get("Content-Type", "")
            if resp.ok:
                head = resp.raw.read(8, decode_content=True) if resp.raw else b""
                fname = filename_for(resp.url, dict(resp.headers))
                dest = FILES / fname
                if dest.exists() and not args.force:
                    rec.update(status="cached", local_path=f"files/{fname}",
                               bytes=dest.stat().st_size, content_type=ctype)
                    cached = True
                elif is_file_bytes(ctype, head):
                    size = len(head)
                    with dest.open("wb") as fh:
                        fh.write(head)
                        for chunk in resp.iter_content(65536):
                            fh.write(chunk)
                            size += len(chunk)
                            if size > MAX_BYTES:
                                break
                    rec.update(status="ok", method="requests", local_path=f"files/{fname}",
                               bytes=size, content_type=ctype)
                    saved = True
                else:
                    why = "not_a_file"
            else:
                why = f"http_{resp.status_code}"
            resp.close()
            if saved or cached:
                time.sleep(DELAY_S)
        except requests.exceptions.RequestException as e:
            why = f"error: {type(e).__name__}"

        # 2) Chromium-network fallback for bot-blocked / reset files
        if not saved and not cached and pw:
            try:
                st, hdrs, body = pw.get(u)
                ctype2 = _ci(hdrs, "Content-Type")
                if st == 200 and body and is_file_bytes(ctype2, body[:8]):
                    fname = filename_for(u, hdrs)
                    dest = FILES / fname
                    if dest.exists() and not args.force:
                        rec.update(status="cached", local_path=f"files/{fname}",
                                   bytes=dest.stat().st_size, content_type=ctype2)
                        cached = True
                    else:
                        dest.write_bytes(body[:MAX_BYTES])
                        rec.update(status="ok", method="rendered", local_path=f"files/{fname}",
                                   bytes=len(body), content_type=ctype2)
                        saved = True
                    time.sleep(DELAY_S)
                else:
                    rec["status"] = why or f"pw_http_{st}"
            except Exception as e:
                rec["status"] = why or f"pw_error: {type(e).__name__}"

        if not rec["status"]:
            rec["status"] = "ok" if saved else ("cached" if cached else (why or "failed"))
        if rec["method"] == "rendered" and saved:
            rendered += 1
        if rec["status"] == "ok":
            ok += 1
        elif rec["status"] == "cached":
            skip += 1
        else:
            fail += 1
        manifest.append(rec)
        if i % 10 == 0 or i == len(urls):
            print(f"[{i:3}/{len(urls)}]  ok={ok} cached={skip} failed={fail} (via browser: {rendered})")

    if pw:
        pw.close()

    (FILES / "manifest.json").write_text(
        json.dumps({"generated_at": cat["generated_at"], "count": len(manifest), "files": manifest},
                   ensure_ascii=False, indent=2), encoding="utf-8")
    inlang = sum(1 for m in manifest if m["language_hint"] and m["status"] in ("ok", "cached"))
    print(f"\nWrote {FILES/'manifest.json'}")
    print(f"  downloaded={ok}  cached={skip}  failed={fail}  (of which {inlang} tagged in-language)")


if __name__ == "__main__":
    main()
