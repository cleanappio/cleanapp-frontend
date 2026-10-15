"""Real bare-Git integration tests; no network, credentials, or production writes."""
import importlib.util
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "deploy-version.py"
SPEC = importlib.util.spec_from_file_location("deploy_version", SCRIPT)
VERSION = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERSION)


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args], stderr=subprocess.PIPE, text=True).strip()


class DeploymentVersionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.remote = self.root / "remote.git"
        subprocess.run(["git", "init", "--bare", "--initial-branch=main", str(self.remote)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.author = self.clone("author")
        (self.author / ".version").write_text("BUILD_VERSION=1.0.437\n")
        (self.author / "app.txt").write_text("event application\n")
        self.commit(self.author, "Initial application")
        git(self.author, "push", "origin", "main")
        self.source = self.clone("source")
        self.actor = self.clone("actor")
        self.source_sha = git(self.source, "rev-parse", "HEAD")

    def clone(self, name):
        destination = self.root / name
        subprocess.run(["git", "clone", str(self.remote), str(destination)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        git(destination, "config", "user.name", "Local integration test")
        git(destination, "config", "user.email", "test@example.invalid")
        return destination

    def commit(self, repo, message):
        git(repo, "add", ".")
        git(repo, "commit", "-m", message)

    def advance_main(self, version=None):
        git(self.actor, "pull", "--ff-only", "origin", "main")
        (self.actor / "concurrent.txt").write_text("concurrent application change\n")
        if version is not None:
            (self.actor / ".version").write_text(f"BUILD_VERSION={version}\n")
        self.commit(self.actor, "Concurrent main update")
        git(self.actor, "push", "origin", "main")

    def assert_source_preserved(self):
        self.assertEqual(git(self.source, "rev-parse", "HEAD"), self.source_sha)
        self.assertEqual((self.source / "app.txt").read_text(), "event application\n")
        self.assertFalse((self.source / "concurrent.txt").exists())
        self.assertEqual(git(self.source, "worktree", "list", "--porcelain").count("worktree "), 1)

    def race_hook(self, version=None, reject_all=False):
        marker = self.root / "push-attempts"
        hook = self.source / ".git" / "hooks" / "pre-push"
        lines = ["#!/bin/sh", "set -eu", f"printf 'attempt\\n' >> {shlex.quote(str(marker))}",
            # Hooks inherit repository-local variables; the racing writer is a different clone.
            "unset $(git rev-parse --local-env-vars)"]
        if reject_all:
            lines.append("exit 1")
        else:
            once = self.root / "race-created"
            actor = shlex.quote(str(self.actor))
            lines += [f"if [ ! -f {shlex.quote(str(once))} ]; then", f"  touch {shlex.quote(str(once))}",
                f"  git -C {actor} pull --ff-only origin main >/dev/null 2>&1",
                f"  printf 'preserve raced feature\\n' > {shlex.quote(str(self.actor / 'concurrent.txt'))}"]
            if version:
                lines.append(f"  printf 'BUILD_VERSION={version}\\n' > {shlex.quote(str(self.actor / '.version'))}")
            lines += [f"  git -C {actor} add .", f"  git -C {actor} commit -m 'Racing main change' >/dev/null 2>&1",
                f"  git -C {actor} push origin main >/dev/null 2>&1", "fi"]
        hook.write_text("\n".join(lines) + "\n")
        hook.chmod(0o755)
        return marker

    def test_seed_uses_latest_version_but_keeps_exact_event_application(self):
        self.advance_main("1.0.438")
        self.assertEqual(VERSION.seed_version(self.source, self.source_sha), "1.0.438")
        self.assertEqual(git(self.source, "diff", "--name-only"), ".version")
        self.assert_source_preserved()

    def test_publish_retries_real_push_race_and_preserves_main_content(self):
        marker = self.race_hook()
        result = VERSION.publish_version(self.source, "1.0.438", self.source_sha, retry_delay=0)
        self.assertEqual(result["attempts"], 2)
        self.assertEqual(marker.read_text().count("attempt"), 2)
        self.assertEqual(git(self.author, "--git-dir", str(self.remote), "show", "main:concurrent.txt"), "preserve raced feature")
        self.assertEqual(git(self.author, "--git-dir", str(self.remote), "show", "main:.version"), "BUILD_VERSION=1.0.438")
        self.assertEqual(git(self.author, "--git-dir", str(self.remote), "diff-tree", "--no-commit-id", "--name-only", "-r", "main"), ".version")
        self.assertEqual((self.source / ".version").read_text(), "BUILD_VERSION=1.0.437\n")
        self.assert_source_preserved()

    def test_equal_and_higher_main_versions_are_never_overwritten(self):
        for version in ["1.0.438", "1.0.439"]:
            with self.subTest(version=version):
                self.advance_main(version)
                previous = git(self.actor, "rev-parse", "HEAD")
                result = VERSION.publish_version(self.source, "1.0.438", self.source_sha, retry_delay=0)
                self.assertEqual(result["result"], "already_recorded")
                self.assertEqual(git(self.author, "--git-dir", str(self.remote), "rev-parse", "main"), previous)
                self.assert_source_preserved()

    def test_racing_version_change_skips_downgrade_without_version_conflict(self):
        self.race_hook("1.0.439")
        result = VERSION.publish_version(self.source, "1.0.438", self.source_sha, retry_delay=0)
        self.assertEqual(result["result"], "already_recorded")
        self.assertEqual(result["attempts"], 2)
        self.assertEqual(git(self.author, "--git-dir", str(self.remote), "show", "main:.version"), "BUILD_VERSION=1.0.439")
        self.assertEqual(git(self.author, "--git-dir", str(self.remote), "show", "main:concurrent.txt"), "preserve raced feature")
        self.assert_source_preserved()

    def test_repeated_push_failure_is_bounded_and_leaves_main_unchanged(self):
        marker = self.race_hook(reject_all=True)
        with self.assertRaisesRegex(VERSION.VersionError, "five normal push attempts"):
            VERSION.publish_version(self.source, "1.0.438", self.source_sha, retry_delay=0)
        self.assertEqual(marker.read_text().count("attempt"), 5)
        self.assertEqual(git(self.author, "--git-dir", str(self.remote), "rev-parse", "main"), self.source_sha)
        self.assert_source_preserved()

    def test_malformed_version_and_wrong_source_fail_without_local_changes(self):
        for invalid in ["BUILD_VERSION=1.0.438\nextra\n", "BUILD_VERSION=1.0.438", "BUILD_VERSION=1.0.x\n", "BUILD_VERSION=1.0.0438\n"]:
            with self.subTest(invalid=invalid), self.assertRaises(VERSION.VersionError):
                VERSION.parse_version(invalid, file=True)
        with self.assertRaisesRegex(VERSION.VersionError, "exact deployment event SHA"):
            VERSION.seed_version(self.source, "0" * 40)
        self.assertEqual(git(self.source, "status", "--porcelain"), "")
        self.assert_source_preserved()


if __name__ == "__main__":
    unittest.main()
