#!/usr/bin/env python3
"""
clean_directory.py — deterministic cleaning rules for data/directory.json entries.
Called by build_directory.py; re-runnable (no network). Rules, in order:

 1. TITLE   : page <title> minus site-name suffix if specific; else the spreadsheet author;
              error/generic titles ('403 Forbidden', 'Home', 'Homepage' ...) are never used.
              Duplicates get a distinguishing label from the URL path. Unique across directory.
 2. DESC    : (a) data/directory_overrides.json (hand-checked), (b) the page's meta/og
              description (data/raw/<id>.html), (c) first informative sentences of
              data/text/<id>.txt, (d) the spreadsheet Description if it is a real sentence.
              40-220 chars, whole sentences, third person, no labels/boilerplate/mojibake.
 3. MERGE   : same normalised URL (no scheme/www/trailing slash/fragment/utm) -> one entry.
 4. DOC LINKS: doc_links_labelled [{url,label}], max 6, non-documents dropped.
 5. ACTION  : read | watch | contact | discuss (see action_for).
 6. ORDER   : described first, Australian before overseas, then title. `overseas` flag.
"""
from __future__ import annotations

import html as htmllib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit, unquote

DATA = Path(__file__).resolve().parent.parent / "data"
OVERRIDES_FILE = DATA / "directory_overrides.json"

GENERIC_TITLES = {
    "home", "homepage", "home page", "welcome", "index", "untitled", "403", "404", "403 forbidden",
    "404 not found", "page not found", "not found", "access denied", "sorry!", "sorry", "error",
    "service not found", "select your suburb", "confirm your location", "search results",
    "about us", "services", "patient resources", "overview", "for patients", "resources",
}
ERROR_RE = re.compile(r"\b(40[0-9]|50[0-9]|forbidden|access denied|not found|sorry|just a moment)\b", re.I)
SPREADSHEET_LABELS = {
    "all subdomains", "all domains", "peer support", "hotline", "physical activity", "interpreter service",
    "interpreting service", "disability support", "podcast", "podcasts", "video", "toolkit", "medication",
    "hydrotherapy", "app", "helpline", "pain mx course", "health advocacy organisations", "multiple domains",
    "multiple subdomains", "exercise program nsw", "health coaching", "physical activity",
}
BOILER_RE = re.compile(
    r"cookie|skip to|javascript|©|copyright|all rights reserved|privacy policy|terms (of|and)|subscribe|newsletter|"
    r"sign up|log ?in|click here|read more|find out more|learn more|menu|search\b|donate|follow us|enable|"
    r"browser|\bapp store\b|google play|accept|\bfaq\b|404|403|forbidden|http|www\.", re.I)
FIRST_PERSON_RE = re.compile(r"\b(we|we're|we’re|we've|our|ours|us|i|my|let's)\b", re.I)
SITE_SUFFIX_SPLIT = re.compile(r"\s+[|–—\-:·]\s+")
OVERSEAS_HOSTS = ("nz", "uk", "us")
OVERSEAS_DOMAINS = {
    "rheumatology.org", "orthoinfo.org", "spondylitis.org", "webmd.com", "drugs.com", "nutritionfacts.org",
    "who.int", "healthify.nz", "ehlers-danlos.com", "fraxplus.org", "patientlibrary.net", "headspace.com",
    "paintoolkit.org",
}
DOC_DROP_RE = re.compile(r"(sprite|tracking|pixel|logo|icon|favicon|\.(png|jpe?g|gif|svg|css|js)(\?|$)|^#|javascript:|mailto:)", re.I)


# ----------------------------------------------------------------------------- text utils
def fix_text(s: str) -> str:
    s = htmllib.unescape(s or "")
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("\xa0", " ").replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"\s+", " ", s).strip()
    return s


def has_mojibake(s: str) -> bool:
    return "�" in s or "Ã" in s or "â€" in s


def repair_mojibake(s: str) -> str:
    """Spreadsheet/page text holds U+FFFD where an apostrophe, hyphen or symbol was lost.
    Fix the common cases; remove the rest."""
    s = re.sub(r"(?<=[A-Za-z])�(?=s\b)", "'", s)         # woman�s -> woman's
    s = re.sub(r"(?<=[A-Za-z])�(?=(re|ve|ll|t|d)\b)", "'", s)
    s = re.sub(r"�\s*(?=[A-Z])", "- ", s) if " � " in s else s
    s = s.replace(" � ", " - ")
    s = re.sub(r"(®|�)", "", s) if "�" in s else s
    return re.sub(r"\s+", " ", s).strip()


def norm_url(u: str) -> str:
    p = urlsplit(u.strip())
    host = re.sub(r"^www\.", "", p.netloc.lower())
    q = "&".join(x for x in p.query.split("&") if x and not x.lower().startswith(("utm_", "fbclid", "gclid")))
    path = p.path.rstrip("/")
    return f"{host}{path}" + (f"?{q}" if q else "")


def host_of(u: str) -> str:
    return re.sub(r"^www\.", "", urlsplit(u).netloc.lower())


def is_overseas(url: str) -> bool:
    h = host_of(url)
    if h.endswith((".gov.au", ".org.au", ".edu.au", ".com.au", ".net.au", ".asn.au")) or h.endswith(".au"):
        return False
    if "nsw.gov" in h:
        return False
    if h.endswith((".nz", ".uk", ".co.uk", ".org.uk", ".gov.uk")) or h in OVERSEAS_DOMAINS:
        return True
    # .com/.org/.int/.net with no Australian TLD: treat as overseas unless listed as AU-run.
    return h.endswith((".com", ".org", ".int", ".net", ".info")) and h not in AU_RUN_GLOBAL


# Non-.au domains that are run from Australia (so not "overseas").
AU_RUN_GLOBAL = {
    "muscha.org", "backpain.muscha.org", "asaustralia.org", "asvictoria.org", "jointaction.info",
    "tamethebeast.org", "paintoolkit.org.au", "painhealth.com.au", "myflareup.org", "cja.org",
    "ywasg.com", "facebook.com", "apps.apple.com", "myjoint-taichi.org", "swapit.net.au",
    "au.physiapp.com", "myknee.trekeducation.org", "wellmob.org.au", "knowyourbones.org.au",
    "735055.us25.myftpupload.com", "lupusvoiceaustralia.org.au", "myflareup.org", "paintrainer.org",
    "paintoolkit.org",
}
# Overseas content hosts that happen to sit on apps.apple.com are judged by their store path (/us/).


def overseas_for(r_url: str) -> bool:
    p = urlsplit(r_url)
    h = host_of(r_url)
    if h == "apps.apple.com":
        return "/us/" in p.path
    if h in ("paintoolkit.org",):  # Pete Moore's UK Pain Toolkit
        return True
    if h in ("paintrainer.org", "myflareup.org"):  # US-run
        return True
    return is_overseas(r_url)


# ----------------------------------------------------------------------------- overrides
def load_overrides() -> dict:
    if OVERRIDES_FILE.exists():
        return json.loads(OVERRIDES_FILE.read_text(encoding="utf-8")).get("by_id", {})
    return {}


# ----------------------------------------------------------------------------- title
def clean_page_title(t: str, author: str, host: str) -> str:
    t = repair_mojibake(fix_text(t))
    if not t or ERROR_RE.search(t) and len(t) < 40:
        return ""
    parts = [p.strip() for p in SITE_SUFFIX_SPLIT.split(t) if p.strip()]
    parts = [p for p in parts if p.lower() not in GENERIC_TITLES and not p.lower().startswith("home")] or []
    if not parts:
        return ""
    # Keep the first specific part; if it is only a site name, that is still a fine title.
    best = parts[0]
    if len(best) < 4 or best.lower() in GENERIC_TITLES or ERROR_RE.search(best):
        return ""
    return best[:90]


def clean_author(a: str) -> str:
    a = repair_mojibake(fix_text(a))
    a = re.split(r"\.\s+", a)[0] if len(a) > 70 else a
    return a.strip(" .")


def path_label(url: str) -> str:
    segs = [unquote(s) for s in urlsplit(url).path.split("/") if s]
    segs = [s for s in segs if s.lower() not in ("en", "au", "home", "index", "pages", "resources", "static", "wps")]
    if not segs:
        return ""
    s = re.sub(r"\.(aspx?|html?|php|pdf)$", "", segs[-1], flags=re.I)
    s = re.sub(r"[-_+]+", " ", s).strip()
    return s[:1].upper() + s[1:] if s else ""


# ----------------------------------------------------------------------------- description
META_RE = re.compile(
    r"<meta[^>]+(?:name|property)=['\"](?:og:description|description|twitter:description)['\"][^>]*>", re.I)
CONTENT_RE = re.compile(r"content=['\"]([^'\"]*)['\"]", re.I)


def meta_description(rid: str) -> str:
    f = DATA / "raw" / f"{rid}.html"
    if not f.exists():
        return ""
    try:
        h = f.read_text(encoding="utf-8", errors="replace")[:200000]
    except OSError:
        return ""
    best = ""
    for m in META_RE.finditer(h):
        c = CONTENT_RE.search(m.group(0))
        if c and len(c.group(1)) > len(best):
            best = c.group(1)
    return fix_text(best)


def sentences(text: str) -> list[str]:
    text = fix_text(text)
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z\"'])", text) if s.strip()]


def good_sentence(s: str) -> bool:
    if len(s) < 25 or len(s) > 220 or has_mojibake(s):
        return False
    if BOILER_RE.search(s) or FIRST_PERSON_RE.search(s):
        return False
    if s.endswith("?") or s.isupper() or s.count("|") or s.count(">"):
        return False
    return s[0].isupper() and s.rstrip().endswith((".", "!"))


def pack(sents: list[str], lo=40, hi=220) -> str:
    out = ""
    for s in sents:
        cand = (out + " " + s).strip()
        if len(cand) <= hi:
            out = cand
        else:
            break
        if len(out) >= 110:
            break
    return out if lo <= len(out) <= hi else ""


def description_candidates(r: dict) -> list[tuple[str, str]]:
    """[(source, text)] best first."""
    c = []
    m = meta_description(r["id"])
    if m and not has_mojibake(m):
        s = pack([x for x in sentences(m) if good_sentence(x)])
        if s:
            c.append(("meta", s))
    tf = DATA / "text" / f"{r['id']}.txt"
    if tf.exists():
        txt = tf.read_text(encoding="utf-8", errors="replace")[:6000]
        lines = [l.strip() for l in txt.splitlines() if len(l.strip()) > 30]
        s = pack([x for l in lines[:40] for x in sentences(l) if good_sentence(x)])
        if s:
            c.append(("text", s))
    for d in r.get("descriptions", []):
        d = repair_mojibake(fix_text(d))
        if d.lower().rstrip(". ") in SPREADSHEET_LABELS or d.lower().startswith("all "):
            continue
        ss = [x for x in sentences(d) if len(x) > 25 and not FIRST_PERSON_RE.search(x)]
        s = pack(ss)
        if s and len(d.split()) > 6:
            c.append(("sheet", s))
    return c


def description_ok(d: str) -> bool:
    low = d.lower().strip()
    return (40 <= len(d) <= 220 and not has_mojibake(d) and not low.startswith("all ")
            and low.rstrip(".") not in SPREADSHEET_LABELS and not ERROR_RE.search(d[:40])
            and "<" not in d and ">" not in d)


# ----------------------------------------------------------------------------- doc links
DOC_EXT_RE = re.compile(r"\.(pdf|docx?|xlsx?|pptx?)(\?|#|$)|@@download|pdf_file|/download/|\.pdf", re.I)


def _words(x: str) -> str:
    x = re.sub(r"[-_+]+", " ", unquote(x))
    x = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", x)           # CamelCase -> Camel Case
    x = re.sub(r"[0-9a-f]{8,}|v?\d{6,}", "", x)
    x = re.sub(r"(final|web|a4|print|updated?)", "", x, flags=re.I)
    return re.sub(r"\s+", " ", x).strip()


def doc_label(url: str) -> str:
    path = urlsplit(url).path
    segs = [x for x in path.split("/") if x and x not in ("@@download", "file", "download")]
    name = unquote(segs[-1]) if segs else "Document"
    ext = re.search(r"\.(pdf|docx?|xlsx?|pptx?)$", name, re.I)
    kind = ext.group(1).upper() if ext else "PDF" if "pdf" in url.lower() else "file"
    base = _words(re.sub(r"\.[A-Za-z0-9]{2,4}$", "", name) if ext else name)
    if LANG_RE.fullmatch(base) and len(segs) > 1:          # .../<slug>/assyrian/@@download/file
        base = f"{_words(segs[-2])} ({base.capitalize()})"
    if not base or len(base) < 3 or base.lower() in ("download", "file", "attachment"):
        base = _words(segs[-2]) if len(segs) > 1 else "Document"
    base = base[:1].upper() + base[1:]
    if len(base) > 70:
        base = base[:70].rsplit(" ", 1)[0] + "..."
    return f"{base} ({kind})"


ADMIN_RE = re.compile(r"privacy|terms|policy|governance|framework|schedule|referral[ -]?(letter|form)|"
                      r"client referral|annual ?report|report|submission|strategic|recruit|media release|reconciliation|"
                      r"registry|stakeholder|campaign|et al|journal|references|constitution|^[0-9a-f]{5,}", re.I)
LANG_NAMES = ["Arabic", "Vietnamese", "Assyrian", "Chinese", "Amharic", "Bengali", "Croatian", "Greek", "Hindi",
              "Italian", "Khmer", "Korean", "Macedonian", "Persian", "Spanish", "Turkish", "Punjabi", "Tamil",
              "Thai", "Dinka", "Dari", "Farsi", "Swahili", "Polish", "Russian", "Serbian", "Somali", "Tagalog",
              "Urdu", "Japanese", "Indonesian", "Hebrew", "German", "French", "Maltese", "Samoan", "Tongan",
              "Bosnian", "Cantonese", "Mandarin", "Armenian", "Lao", "Hakha Chin", "Chin", "Burmese", "Nepali", "Filipino", "Portuguese", "Dutch", "Hmong", "Karen", "Tigrinya", "Sinhalese"]
LANG_RE = re.compile(r"\b(" + "|".join(LANG_NAMES) + r")\b", re.I)


def label_doc_links(urls: list[str], known: dict[str, str] | None = None, card_langs=()) -> list[dict]:
    seen, out = set(), []
    card = {l.lower() for l in card_langs}
    for u in urls:
        if DOC_DROP_RE.search(u) or u in seen or not DOC_EXT_RE.search(u):
            continue
        lab = (known or {}).get(u) or doc_label(u)
        if ADMIN_RE.search(lab) or ADMIN_RE.search(unquote(u.rsplit("/", 1)[-1])):
            continue
        langs = {m.lower() for m in LANG_RE.findall(lab)}
        if langs and not langs <= card:
            continue  # language-specific document that does not match this card's language tags
        seen.add(u)
        out.append({"url": u, "label": lab})
        if len(out) == 6:
            break
    # make labels unique within a resource
    counts: dict[str, int] = {}
    for o in out:
        counts[o["label"]] = counts.get(o["label"], 0) + 1
    seen_n: dict[str, int] = {}
    for o in out:
        if counts[o["label"]] > 1:
            seen_n[o["label"]] = seen_n.get(o["label"], 0) + 1
            o["label"] = o["label"].replace(" (", f" {seen_n[o['label']]} (", 1)
    return out


# ----------------------------------------------------------------------------- action
# Strict, deterministic. A wrong label sends a person the wrong way, so the default is 'read'
# and each non-read label needs a cue in the resource's own title/description/URL:
#   watch   : video / webinar content (podcasts are 'read').
#   discuss : the resource's PURPOSE is preparing for / taking part in an appointment.
#   contact : the resource itself is a line, group, forum, service, directory of services or
#             enrol-in program you call, join or book. Not toolkits, link pages, apps or
#             information sites. Exceptions are set per resource in directory_overrides.json
#             ("action" + reason).
WATCH_RE = re.compile(r"\b(videos?|webinars?|youtube|vimeo)\b", re.I)
DISCUSS_RE = re.compile(r"questions to ask|ask your (doctor|gp|health)|prepar\w+ (for )?(your |an? )?"
                        r"(appointment|specialist)|shared decision|how to get a referral|care ?plan", re.I)
CONTACT_RE = re.compile(
    r"\b(helpline|hotline|phone line|call-back|telephone coaching|phone and online health coaching|"
    r"support groups?|peer support|(?:community|online|discussion) forum|"
    r"find a (?:health )?service|service finder|services? search|directory of|health services? directory|"
    r"national pain services directory|interpret(?:er|ing) services?|interpreter service|enrol|"
    r"support program)\b", re.I)


def action_for(e: dict) -> str:
    title_url = f"{e['title']} {e['url']}"
    text = f"{e['title']} {e['description']}"
    if WATCH_RE.search(title_url) or any(x in e["url"].lower() for x in ("youtube.com", "vimeo.com")):
        return "watch"
    if DISCUSS_RE.search(text):
        return "discuss"
    if CONTACT_RE.search(text):
        return "contact"
    return "read"


# ----------------------------------------------------------------------------- order
# Tier 1 = the trusted-source organisations the app already cites (server/evidence.js SOURCES),
# matched by host. Then other Australian government, other Australian orgs, then overseas last.
TIER1_HOSTS = ("arthritisaustralia.org.au", "muscha.org", "aci.health.nsw.gov.au", "painhealth.com.au",
               "healthdirect.gov.au", "chronicpainaustralia.org.au", "activeandhealthy.nsw.gov.au",
               "tga.gov.au", "painaustralia.org.au", "health.gov.au")


def tier(e: dict) -> int:
    if e["overseas"]:
        return 3
    h = host_of(e["url"])
    if (any(h == t or h.endswith("." + t) for t in TIER1_HOSTS)
            or (h == "nsw.gov.au" and "gethealthyservice" in e["url"].lower())):
        return 0
    if h.endswith(".gov.au") or h.endswith("nsw.gov.au"):
        return 1
    return 2


def sort_key(e: dict):
    """Overseas last; then tier; within a tier, resources with a confirmed condition or the
    'What is this condition?' subdomain first (they answer 'Understanding my condition'); then title."""
    about = bool(e["conditions"]) or "What is this condition?" in e["tags"].get("understanding", [])
    return (e["overseas"], tier(e), not about, e["title"].lower())
