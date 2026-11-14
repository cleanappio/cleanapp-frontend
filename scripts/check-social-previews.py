#!/usr/bin/env python3
"""Check crawler HTML and social-card PNGs on a completed localhost build.

Production URLs in metadata are validated, then mapped to the same local server.
No production requests, report submissions, or external image generation occur.
"""
import argparse
import concurrent.futures
import hashlib
import json
import struct
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser


SITE_URL = "https://www.cleanapp.io"
ROUTES = (
    "/", "/agents", "/report-a-pothole", "/bug-reporting",
    "/solutions/brands", "/blog/best-incident-reporting-apps",
)
IMAGE_PATH = "/api/share-image"
MAX_HTML_BYTES = 2 * 1024 * 1024
MAX_IMAGE_BYTES = 512 * 1024
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("redirects are not allowed by this localhost checker")


class SocialHead(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = {}

    def handle_starttag(self, tag, attrs):
        if tag != "meta":
            return
        attrs = dict(attrs)
        name = attrs.get("property") or attrs.get("name") or ""
        if name.startswith(("og:", "twitter:")):
            self.tags.setdefault(name, []).append(attrs.get("content", ""))

    def one(self, name):
        values = self.tags.get(name, [])
        if len(values) != 1 or not values[0].strip():
            raise ValueError(f"expected exactly one nonempty {name}")
        return values[0]


def read(base, route, timeout, limit):
    # Disable proxies and redirects: even a bad preview cannot send this checker
    # to the production URL printed in its metadata or a remote login page.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request(base + route, headers={
        "User-Agent": "Twitterbot/1.0", "Cache-Control": "no-cache",
    })
    with opener.open(request, timeout=timeout) as response:
        if response.status != 200:
            raise ValueError(f"expected HTTP 200, got {response.status}")
        body = response.read(limit + 1)
        if len(body) > limit:
            raise ValueError(f"response exceeds {limit} bytes")
        return body, response.headers.get_content_type()


def local_image_path(image_url, route):
    parsed = urllib.parse.urlsplit(image_url)
    if (parsed.scheme != "https" or parsed.netloc != "www.cleanapp.io"
            or parsed.path != IMAGE_PATH or parsed.fragment):
        raise ValueError("social image must use the canonical HTTPS share-image endpoint")
    fields = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True,
                                    strict_parsing=True, max_num_fields=4)
    if len(fields) != 2 or dict(fields) != {"path": route, "v": "1"}:
        raise ValueError("social image must contain only this route's path and v=1")
    return parsed.path + "?" + parsed.query


def check_page(base, route, timeout):
    row = {"path": route, "errors": []}
    try:
        body, content_type = read(base, route, timeout, MAX_HTML_BYTES)
        if content_type != "text/html":
            raise ValueError("expected HTML content type")
        head = SocialHead()
        head.feed(body.decode("utf-8"))
        image = head.one("og:image")
        if image != head.one("twitter:image"):
            raise ValueError("OG and Twitter images differ")
        if "cleanapp-social-card.png" in image:
            raise ValueError("generic social image is still selected")
        if head.one("og:image:width") != "1200" or head.one("og:image:height") != "630":
            raise ValueError("OG dimensions must be 1200x630")
        head.one("twitter:image:alt")
        local_path = local_image_path(image, route)
        png, image_type = read(base, local_path, timeout, MAX_IMAGE_BYTES)
        if image_type != "image/png":
            raise ValueError("expected image/png content type")
        if (len(png) < 33 or not png.startswith(PNG_SIGNATURE)
                or png[8:16] != b"\x00\x00\x00\x0dIHDR"):
            raise ValueError("missing PNG signature or IHDR")
        if struct.unpack(">II", png[16:24]) != (1200, 630):
            raise ValueError("PNG dimensions must be 1200x630")
        row.update(image=image, image_bytes=len(png), image_sha256=hashlib.sha256(png).hexdigest())
    except (OSError, ValueError, UnicodeError) as exc:
        row["errors"].append(str(exc))
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://127.0.0.1:3017")
    parser.add_argument("--timeout", type=float, default=15)
    args = parser.parse_args()
    try:
        origin = urllib.parse.urlsplit(args.base)
        origin.port  # Reject malformed/out-of-range ports before any request.
        valid = (origin.scheme in {"http", "https"}
                 and origin.hostname in {"localhost", "127.0.0.1", "::1"}
                 and origin.username is None and origin.password is None
                 and origin.path in {"", "/"} and not origin.query and not origin.fragment)
    except ValueError:
        valid = False
    if not valid:
        parser.error("--base must be a localhost origin; production is never contacted")
    if not 0 < args.timeout <= 60:
        parser.error("--timeout must be greater than 0 and at most 60 seconds")
    base = args.base.rstrip("/")
    errors = []
    try:
        robots, content_type = read(base, "/robots.txt", args.timeout, 64 * 1024)
        if content_type != "text/plain":
            raise ValueError("expected text/plain robots.txt")
        directives = [tuple(part.strip() for part in line.split("#", 1)[0].split(":", 1))
                      for line in robots.decode("utf-8").splitlines()
                      if ":" in line.split("#", 1)[0]]
        rules = [(name.lower(), value) for name, value in directives]
        if ("disallow", "/api/") not in rules:
            raise ValueError("robots.txt must retain Disallow: /api/")
        api_allows = [value for name, value in rules if name == "allow" and value.startswith("/api/")]
        if api_allows != [IMAGE_PATH]:
            raise ValueError("robots.txt must allow only /api/share-image within /api/")
    except (OSError, ValueError, UnicodeError) as exc:
        errors.append(f"/robots.txt: {exc}")

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        pages = list(pool.map(lambda route: check_page(base, route, args.timeout), ROUTES))
    for page in pages:
        errors.extend(f"{page['path']}: {error}" for error in page["errors"])
    hashes = [page["image_sha256"] for page in pages if "image_sha256" in page]
    if len(hashes) == len(ROUTES) and len(set(hashes)) != len(ROUTES):
        errors.append("different page themes returned identical PNGs")
    print(json.dumps({"base": base, "canonical_site": SITE_URL, "checked_pages": len(pages),
                      "production_requests": 0, "report_submissions": 0,
                      "errors": errors, "pages": pages}, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
