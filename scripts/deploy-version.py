#!/usr/bin/env python3
"""Deployment-owned version allocation and version-only main reconciliation."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time

VERSION = r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)"
VERSION_FILE = re.compile(r"BUILD_VERSION=" + VERSION + r"\n\Z")
VERSION_VALUE = re.compile(VERSION + r"\Z")
SOURCE_SHA = re.compile(r"[0-9a-f]{40}\Z")


class VersionError(Exception):
    pass


def git(repo, *args, check=True):
    result = subprocess.run(
        ["git", "-C", str(repo), *args], stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, text=True, check=False,
    )
    if check and result.returncode:
        # Do not echo remote diagnostics, credential configuration, or environment.
        raise VersionError("Git version operation failed.")
    return result


def parse_version(value, file=False):
    match = (VERSION_FILE if file else VERSION_VALUE).fullmatch(value)
    if not match:
        raise VersionError("Expected a valid three-part deployment version.")
    return tuple(int(part) for part in match.groups())


def read_version(repo):
    content = (Path(repo) / ".version").read_text(encoding="utf-8")
    parts = parse_version(content, file=True)
    return ".".join(str(part) for part in parts)


def require_source(repo, source_sha):
    if not SOURCE_SHA.fullmatch(source_sha) or git(repo, "rev-parse", "HEAD").stdout.strip() != source_sha:
        raise VersionError("Checkout HEAD must remain the exact deployment event SHA.")


def fetch_main(repo):
    git(repo, "fetch", "--no-tags", "origin", "refs/heads/main:refs/remotes/origin/main")


def seed_version(repo, source_sha):
    """Update the build's one automated input without switching source HEAD."""
    require_source(repo, source_sha)
    fetch_main(repo)
    content = git(repo, "show", "origin/main:.version").stdout
    parse_version(content, file=True)
    (Path(repo) / ".version").write_text(content, encoding="utf-8", newline="")
    require_source(repo, source_sha)
    return read_version(repo)


def publish_version(repo, built_version, source_sha, retry_delay=2):
    """Record a consumed build on fresh main, retaining all concurrent changes."""
    built = parse_version(built_version)
    require_source(repo, source_sha)
    repo = Path(repo).resolve()
    with tempfile.TemporaryDirectory(prefix="cleanapp-deploy-version-") as directory:
        worktree = Path(directory) / "checkout"
        added = False
        try:
            for attempt in range(1, 6):
                fetch_main(repo)
                if not added:
                    git(repo, "worktree", "add", "--detach", str(worktree), "origin/main")
                    added = True
                else:
                    # This worktree contains only our disposable version commit.
                    git(worktree, "reset", "--hard", "origin/main")
                current_version = read_version(worktree)
                if parse_version(current_version) >= built:
                    require_source(repo, source_sha)
                    return {"result": "already_recorded", "version": current_version, "attempts": attempt}
                (worktree / ".version").write_text(f"BUILD_VERSION={built_version}\n", encoding="utf-8", newline="")
                git(worktree, "add", "--", ".version")
                staged = git(worktree, "diff", "--cached", "--name-only", "-z").stdout.split("\0")
                if staged != [".version", ""]:
                    raise VersionError("Refusing a deployment commit containing other files.")
                git(worktree, "-c", "user.name=github-actions[bot]", "-c",
                    "user.email=github-actions[bot]@users.noreply.github.com", "commit", "-m",
                    f"chore: record frontend build {built_version} [skip ci]")
                pushed = git(worktree, "push", "origin", "HEAD:refs/heads/main", check=False)
                if pushed.returncode == 0:
                    require_source(repo, source_sha)
                    return {"result": "recorded", "version": built_version, "attempts": attempt}
                if attempt < 5:
                    time.sleep(retry_delay * attempt)
            raise VersionError("Version publication failed after five normal push attempts; the site may already be deployed.")
        finally:
            if added:
                git(repo, "worktree", "remove", "--force", str(worktree), check=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".")
    commands = parser.add_subparsers(dest="command", required=True)
    seed = commands.add_parser("seed")
    seed.add_argument("--source-sha", required=True)
    commands.add_parser("read")
    publish = commands.add_parser("publish")
    publish.add_argument("--source-sha", required=True)
    publish.add_argument("--version", required=True)
    args = parser.parse_args()
    if args.command == "seed":
        print(json.dumps({"seeded_version": seed_version(args.repo, args.source_sha)}))
    elif args.command == "read":
        print(read_version(args.repo))
    else:
        print(json.dumps(publish_version(args.repo, args.version, args.source_sha)))


if __name__ == "__main__":
    try:
        main()
    except (VersionError, OSError, ValueError):
        error = sys.exc_info()[1]
        print(str(error) if isinstance(error, VersionError) else "Deployment version operation failed.", file=sys.stderr)
        sys.exit(1)
