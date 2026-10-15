#!/usr/bin/env python3
"""Read private first-party counts from stdin; output aggregate CSV, never raw rows.

Example: ssh deployer@HOST 'sudo cat /var/lib/cleanapp/acquisition-cleanapp_frontend/*.ndjson' | python3 scripts/summarize-acquisition.py
Counts are browser-observed events, not people, verified publication or revenue.
"""
import csv
import json
import sys
from collections import Counter

FIELDS = ("hour", "event", "page", "landing", "source", "surface")
counts = Counter()
for line in sys.stdin:
    try:
        row = json.loads(line)
        if set(row) != set(FIELDS) or any(not isinstance(row[key], str) for key in FIELDS):
            continue
        counts[tuple(row[key] for key in FIELDS)] += 1
    except (ValueError, TypeError):
        continue
writer = csv.writer(sys.stdout)
writer.writerow((*FIELDS, "count"))
for key, count in sorted(counts.items()):
    writer.writerow((*key, count))
