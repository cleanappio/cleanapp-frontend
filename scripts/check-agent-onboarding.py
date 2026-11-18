#!/usr/bin/env python3
"""Discover agent onboarding from served HTML without JS, credentials or writes.

Only fetches this local preview. Documented production API URLs are inspected as
text; this check never contacts them or submits an observation.
"""
import argparse
import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.headings = {"title": [], "h1": []}
        self.active_heading = None
        self.href = None
        self.label = []

    def handle_starttag(self, tag, attrs):
        if tag in self.headings:
            self.active_heading = tag
        if tag == "a":
            self.href = dict(attrs).get("href", "")
            self.label = []

    def handle_data(self, data):
        if self.active_heading:
            self.headings[self.active_heading].append(data)
        if self.href is not None:
            self.label.append(data)

    def handle_endtag(self, tag):
        if tag == self.active_heading:
            self.active_heading = None
        if tag == "a" and self.href is not None:
            self.links.append((self.href, " ".join("".join(self.label).split())))
            self.href = None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://127.0.0.1:3017")
    args = parser.parse_args()
    base = urllib.parse.urlsplit(args.base)
    if base.scheme not in {"http", "https"} or base.hostname not in {"localhost", "127.0.0.1", "::1"} or base.path not in {"", "/"} or base.query or base.fragment:
        parser.error("--base must be a localhost origin; remote intake is never called")

    def read(path):
        with urllib.request.urlopen(args.base.rstrip("/") + path, timeout=30) as response:
            body = response.read(512 * 1024 + 1)
            assert len(body) <= 512 * 1024, "Discovery document exceeds its read bound"
            return body.decode("utf-8"), response.headers.get("Content-Type", "")

    def page_at(path):
        html, _ = read(path)
        page = Page()
        page.feed(html)
        return page

    home = page_at("/")
    assert any(urllib.parse.urlsplit(href).path == "/agents" for href, _ in home.links), "Homepage HTML does not expose agent onboarding"
    page = page_at("/agents")
    assert any(urllib.parse.urlsplit(href).path == "/agents.txt" for href, _ in page.links), "Agent page does not link machine instructions"
    for tag in ("title", "h1"):
        heading = "".join(page.headings[tag]).lower()
        assert "report" in heading and "ai agent" in heading, f"Agent page {tag} does not identify the reporting task"
    topic_links = {
        "/bug-reporting": "Report a software bug with an AI agent",
        "/report-a-website-problem": "Set up a browser agent to report a website problem",
        "/report-an-accessibility-barrier": "Report an accessibility barrier with an AI agent",
    }
    for path, label in topic_links.items():
        assert any(href == "/agents" and text.removesuffix("→").strip() == label for href, text in page_at(path).links), f"{path} misses the contextual agent setup link"
    instructions, kind = read("/agents.txt")
    assert kind.startswith("text/plain"), "Machine instructions must be plain text"
    expected = {
        "Canonical page": "https://www.cleanapp.io/agents",
        "GitHub onboarding guide": "https://github.com/cleanappio/cleanapp_back_end_v2/blob/main/docs/agent-onboarding.md",
        "MCP endpoint": "https://live.cleanapp.io/openai/mcp",
        "MCP transport": "Streamable HTTP",
        "MCP authentication": "none",
        "Public report endpoint": "https://live.cleanapp.io/api/v1/public/agent-reports",
        "Public report authentication": "none",
        "OpenAPI document": "https://live.cleanapp.io/api/v1/openapi.yaml",
    }
    for label, value in expected.items():
        matches = [line.partition(": ")[2] for line in instructions.splitlines() if line.startswith(label + ": ")]
        assert matches == [value], f"Missing or ambiguous discovery field: {label}"
    assert any(href == expected["GitHub onboarding guide"] for href, _ in page.links), "Agent page does not link the GitHub setup guide"
    for term in ("GET-only", "cleanapp_prepare_report", "cleanapp_submit_report", "cleanapp_report_status", "UUIDv4", "private", "Retry-After"):
        assert term in instructions, f"Missing operating rule: {term}"
    llms, _ = read("/llms.txt")
    assert expected["Canonical page"] in llms and "https://www.cleanapp.io/agents.txt" in llms, "llms.txt misses the canonical front door"
    sitemap, _ = read("/sitemap.xml")
    locations = {element.text for element in ET.fromstring(sitemap).findall("{*}url/{*}loc")}
    assert expected["Canonical page"] in locations, "Sitemap misses the public agent page"
    print(json.dumps({"agent_discovery": "passed", "path": ["/", "/agents", "/agents.txt"],
                      "mcp_endpoint": expected["MCP endpoint"], "public_report_endpoint": expected["Public report endpoint"],
                      "remote_api_calls": 0, "submissions": 0}))


if __name__ == "__main__":
    main()
