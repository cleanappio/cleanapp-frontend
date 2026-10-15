#!/usr/bin/env python3
"""Read-only production HTML checks. Start a completed build before running.

python3 scripts/check-rendered-seo.py --base http://127.0.0.1:3017
No dependencies, browser execution, report submissions, or external fetches.
"""
import argparse
import concurrent.futures
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path

REQUIRED_ROUTES = {
    "/", "/report-a-problem", "/incident-reporting", "/hazard-reporting",
    "/bug-reporting", "/litter-reporting", "/report-a-pothole",
    "/report-illegal-dumping", "/report-a-website-problem",
    "/report-an-accessibility-barrier", "/solutions/cities",
    "/solutions/brands", "/solutions/property-managers",
    "/solutions/workplace-safety", "/about", "/company", "/faq",
    "/pricing", "/download", "/privacy",
}
REPORTER_ROUTES = {
    "/", "/report-a-problem", "/incident-reporting", "/hazard-reporting",
    "/bug-reporting", "/litter-reporting", "/report-a-pothole",
    "/report-illegal-dumping", "/report-a-website-problem",
    "/report-an-accessibility-barrier",
}
PRIVATE_PREFIXES = ("/api/", "/login", "/signup", "/dashboard", "/billing", "/checkout", "/reset-password")
MAX_RESPONSE_BYTES = 6 * 1024 * 1024


def clean_text(value):
    return " ".join(value.split())


def canonical_url(base, route):
    return base.rstrip("/") + ("" if route == "/" else route)


class PageHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.titles, self.headings, self.canonicals = [], [], []
        self.descriptions, self.robots, self.anchors, self.forms = [], [], [], []
        self.title_text = self.heading_text = self.schema_text = None
        self.schemas = []
        self.footer_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "footer":
            self.footer_depth += 1
        elif tag == "title":
            self.title_text = []
        elif tag == "h1":
            self.heading_text = []
        elif tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonicals.append(attrs.get("href", ""))
        elif tag == "meta":
            if attrs.get("name", "").lower() == "description":
                self.descriptions.append(attrs.get("content", ""))
            elif attrs.get("name", "").lower() == "robots":
                self.robots.append(attrs.get("content", ""))
        elif tag == "a":
            self.anchors.append((attrs.get("href", ""), self.footer_depth > 0))
        elif tag == "form":
            self.forms.append(attrs.get("aria-label", ""))
        elif tag == "script" and attrs.get("type") == "application/ld+json":
            self.schema_text = []

    def handle_endtag(self, tag):
        if tag == "footer":
            self.footer_depth = max(0, self.footer_depth - 1)
        elif tag == "title" and self.title_text is not None:
            self.titles.append(clean_text("".join(self.title_text)))
            self.title_text = None
        elif tag == "h1" and self.heading_text is not None:
            self.headings.append(clean_text("".join(self.heading_text)))
            self.heading_text = None
        elif tag == "script" and self.schema_text is not None:
            self.schemas.append("".join(self.schema_text))
            self.schema_text = None

    def handle_data(self, data):
        for current in (self.title_text, self.heading_text, self.schema_text):
            if current is not None:
                current.append(data)


def read(base, route, timeout):
    request = urllib.request.Request(base.rstrip("/") + route, headers={
        "User-Agent": "CleanApp-Rendered-QA/1.0", "Cache-Control": "no-cache",
    })
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read(MAX_RESPONSE_BYTES + 1)
        if len(body) > MAX_RESPONSE_BYTES:
            raise ValueError("response exceeds 6 MiB")
        return response.status, body.decode("utf-8"), response.headers.get("Content-Type", "")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://127.0.0.1:3017")
    parser.add_argument("--canonical-base", default="https://www.cleanapp.io")
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--json", type=Path, help="Optional path for a machine-readable report")
    args = parser.parse_args()
    destination = urllib.parse.urlsplit(args.base)
    if destination.scheme not in {"http", "https"} or destination.hostname not in {"localhost", "127.0.0.1", "::1"}:
        parser.error("--base must be localhost; this checker never crawls production")
    if destination.path not in {"", "/"} or destination.query or destination.fragment:
        parser.error("--base must be an origin without a path, query or fragment")
    errors, warnings, results = [], [], []
    sitemap_paths = set()
    try:
        status, xml, content_type = read(args.base, "/sitemap.xml", args.timeout)
        root = ET.fromstring(xml)
        locations = [element.text or "" for element in root.findall("{*}url/{*}loc")]
        if status != 200 or "xml" not in content_type:
            errors.append("/sitemap.xml: expected HTTP 200 XML")
        if len(locations) != len(set(locations)):
            errors.append("/sitemap.xml: duplicate canonical locations")
        for location in locations:
            parsed = urllib.parse.urlsplit(location)
            route = parsed.path or "/"
            if parsed.query or parsed.fragment or location != canonical_url(args.canonical_base, route):
                errors.append(f"/sitemap.xml: unexpected canonical location {location}")
                continue
            if route.startswith(PRIVATE_PREFIXES):
                errors.append(f"/sitemap.xml: private route included: {route}")
            sitemap_paths.add(route)
        for route in sorted(REQUIRED_ROUTES - sitemap_paths):
            errors.append(f"/sitemap.xml: missing {route}")
    except (OSError, ValueError, ET.ParseError) as exc:
        errors.append(f"/sitemap.xml: {exc}")

    try:
        status, robots, _ = read(args.base, "/robots.txt", args.timeout)
        rules = urllib.robotparser.RobotFileParser()
        rules.parse(robots.splitlines())
        expected_sitemap = canonical_url(args.canonical_base, "/sitemap.xml")
        if status != 200 or expected_sitemap not in (rules.site_maps() or []):
            errors.append("/robots.txt: missing expected sitemap declaration")
        for agent in ("*", "Googlebot", "Bingbot", "OAI-SearchBot", "GPTBot"):
            for route in ("/", "/report-a-problem", "/company", "/report-a-pothole"):
                if not rules.can_fetch(agent, canonical_url(args.canonical_base, route)):
                    errors.append(f"/robots.txt: {agent} cannot fetch {route}")
            if rules.can_fetch(agent, canonical_url(args.canonical_base, "/api/private-check")):
                errors.append(f"/robots.txt: {agent} is unexpectedly allowed on /api/")
    except (OSError, ValueError) as exc:
        errors.append(f"/robots.txt: {exc}")

    def check(route):
        row = {"path": route, "errors": []}
        try:
            status, html, content_type = read(args.base, route, args.timeout)
            page = PageHTML()
            page.feed(html)
            if status != 200 or "html" not in content_type:
                row["errors"].append("expected HTTP 200 HTML")
            if len(page.titles) != 1 or not page.titles[0]:
                row["errors"].append("expected one nonempty title")
            row["title"] = page.titles[0] if page.titles else ""
            expected = canonical_url(args.canonical_base, route)
            if page.canonicals != [expected]:
                row["errors"].append(f"canonical should be {expected}; got {page.canonicals}")
            if len(page.headings) != 1 or not page.headings[0]:
                row["errors"].append(f"expected one nonempty H1; got {page.headings}")
            row["h1"] = page.headings
            if len(page.descriptions) != 1 or not page.descriptions[0].strip():
                row["errors"].append("expected one nonempty meta description")
            if any("noindex" in value.lower() for value in page.robots):
                row["errors"].append("sitemap page is marked noindex")
            if not any(urllib.parse.urlsplit(href).path == "/company" for href, _ in page.anchors):
                row["errors"].append("missing company navigation link")
            if route in REPORTER_ROUTES:
                has_link = any(not footer and urllib.parse.urlsplit(href).path == "/report-a-problem" for href, footer in page.anchors)
                has_composer = "Report a problem" in page.forms
                if not (has_link or has_composer):
                    row["errors"].append("missing direct report action outside the footer or inline composer")
            for schema in page.schemas:
                json.loads(schema)
        except (OSError, ValueError) as exc:
            row["errors"].append(str(exc))
        return row

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(check, sorted(REQUIRED_ROUTES | sitemap_paths)))
    by_title = defaultdict(list)
    for row in results:
        if row.get("title"):
            by_title[row["title"]].append(row["path"])
        errors.extend(f"{row['path']}: {error}" for error in row["errors"])
    for title, routes in by_title.items():
        if len(routes) > 1:
            errors.append(f"duplicate title {title!r}: {', '.join(routes)}")
    report = {"base": args.base, "checked_pages": len(results), "sitemap_pages": len(sitemap_paths), "errors": errors, "warnings": warnings, "pages": results}
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    for row in results:
        print(f"{'FAIL' if row['errors'] else 'OK  '} {row['path']}: {row.get('title', '')}")
    for error in errors:
        print(f"ERROR {error}", file=sys.stderr)
    print(f"Checked {len(results)} pages, sitemap and robots: {len(errors)} errors.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
