"""Exercise safe frontend import/update boundaries without cloud access."""
import base64
import contextlib
import hashlib
import importlib.util
import io
import json
import os
import subprocess
from pathlib import Path
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SHA = "a" * 40
OLD = "sha256:" + "1" * 64
NEW = "sha256:" + "2" * 64


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CLIENT = load("aws_frontend_deploy", ROOT / "scripts/aws-deploy.py")
REMOTE = load("aws_frontend_remote", ROOT / "scripts/aws-deploy-remote.py")


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.baseline = self.directory / "runtime.yml"
        self.baseline.write_text("services: {}\n")
        self.request = {"source_sha": SHA, "version": "1.0.448", "remote_dir": str(self.directory),
                        "compose_files": [str(self.baseline)], "archive_sha256": "0" * 64,
                        "images": [{"mode": "full", "image_id": NEW}]}
        self.calls = []
        self.active = True
        self.isolated = False

    def docker(self, args):
        self.calls.append(args)
        if args[:3] == ["sudo", "-n", "test"]:
            if args[-1] == "/etc/cleanapp-runtime/ISOLATED" and self.isolated:
                raise RuntimeError("fixture runtime is isolated")
            if args[3] == "-f" and args[-1] == "/etc/cleanapp-runtime/ACTIVE" and not self.active:
                raise RuntimeError("fixture runtime is not active")
            return ""
        if "{{.Architecture}}" in args:
            return "x86_64"
        if "config" in args:
            return json.dumps({"name": "cleanapp-production", "services": {
                "cleanapp_frontend": {"container_name": "cleanapp_frontend"},
                "cleanapp_frontend_embedded": {"container_name": "cleanapp_frontend_embedded"}}})
        if "{{.State.Running}}" in args:
            return "true"
        if "{{.Image}}" in args:
            return OLD
        if "{{.Id}}" in args:
            return NEW
        if "{{json .Config.Labels}}" in args:
            if "container" in args:
                return json.dumps({"com.docker.compose.project": "cleanapp-production", "com.docker.compose.service": args[-1]})
            return json.dumps({"org.opencontainers.image.revision": SHA, "org.opencontainers.image.version": "1.0.448"})
        return ""

    def test_dry_run_needs_no_cloud_credentials_or_source_mutation(self):
        with mock.patch.object(CLIENT, "run") as command, contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(CLIENT.main([]), 0)
        command.assert_not_called()
        self.assertTrue(json.loads(output.getvalue())["dry_run"])

    def test_build_context_uses_exact_committed_source_and_allocated_version(self):
        repository = self.directory / "repository"
        repository.mkdir()
        subprocess.run(["git", "init", "-q", str(repository)], check=True)
        (repository / ".version").write_text("BUILD_VERSION=1.0.447\n")
        (repository / "tracked.txt").write_text("committed source")
        subprocess.run(["git", "add", "."], cwd=repository, check=True)
        subprocess.run(["git", "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "source fixture"], cwd=repository, check=True)
        sha = subprocess.run(["git", "rev-parse", "HEAD"], cwd=repository, capture_output=True, text=True, check=True).stdout.strip()
        (repository / "private.runtime").write_text("must not ship")
        (repository / "tracked.txt").write_text("local edit must not ship")
        with mock.patch.object(CLIENT, "ROOT", repository):
            context = CLIENT.stage_source(self.directory, sha, "1.0.448")
        self.assertEqual((context / "tracked.txt").read_text(), "committed source")
        self.assertFalse((context / "private.runtime").exists())
        self.assertEqual((context / ".version").read_text(), "BUILD_VERSION=1.0.448\n")

    def test_corrupt_archive_is_never_loaded(self):
        with mock.patch.object(REMOTE, "command") as command:
            with self.assertRaisesRegex(ValueError, "checksum"):
                REMOTE.receive(self.request, io.BytesIO(b"corrupted archive"))
        command.assert_not_called()

    def test_import_checks_archive_then_loaded_identity(self):
        archive = b"sample archive"
        self.request["archive_sha256"] = hashlib.sha256(archive).hexdigest()
        with mock.patch.object(REMOTE, "command", side_effect=["Loaded", NEW]) as command:
            result = REMOTE.receive(self.request, io.BytesIO(archive))
        self.assertTrue(result["imported"])
        self.assertIn("load", command.call_args_list[0].args[0])

    def test_update_preserves_other_frontend_pin_and_updates_only_selected_role(self):
        pin = self.directory / "docker-compose.aws-frontend-images.yml"
        pin.write_text(json.dumps({"services": {"cleanapp_frontend_embedded": {"image": OLD, "pull_policy": "never"}}}))
        result = REMOTE.activate(self.request, self.docker, lambda request, run: None)
        self.assertTrue(result["deployed"])
        state = json.loads(pin.read_text())["services"]
        self.assertEqual(state["cleanapp_frontend"]["image"], NEW)
        self.assertEqual(state["cleanapp_frontend_embedded"]["image"], OLD)
        updates = [args for args in self.calls if "up" in args]
        self.assertEqual(len(updates), 1)
        self.assertEqual(updates[0][-1], "cleanapp_frontend")
        self.assertIn("--no-deps", updates[0])
        self.assertEqual(updates[0][updates[0].index("--pull") + 1], "never")

    def test_absent_role_cannot_be_bootstrapped(self):
        def absent(args):
            return "false" if "{{.State.Running}}" in args else self.docker(args)
        with self.assertRaisesRegex(ValueError, "dormant"):
            REMOTE.activate(self.request, absent, lambda request, run: None)
        self.assertFalse((self.directory / "docker-compose.aws-frontend-images.yml").exists())

    def test_pin_precedence_and_existing_backend_pins_are_preserved(self):
        pin = self.directory / "docker-compose.aws-frontend-images.yml"
        pin.write_text(json.dumps({"services": {}}))
        backend = self.directory / "docker-compose.aws-backend-images.yml"
        backend.write_text(json.dumps({"services": {"listener": {"image": OLD}}}))
        REMOTE.activate(self.request, self.docker, lambda request, run: None)
        update = next(args for args in self.calls if "up" in args)
        files = [update[index + 1] for index, value in enumerate(update) if value == "-f"]
        self.assertEqual(files, [str(self.baseline), str(backend), str(pin)])

    def test_caller_cannot_override_managed_pin_precedence(self):
        self.request["compose_files"].append(str(self.directory / "docker-compose.aws-frontend-images.yml"))
        with self.assertRaisesRegex(ValueError, "Managed image pins"):
            REMOTE.activate(self.request, self.docker, lambda request, run: None)
        self.assertEqual(self.calls, [])

    def test_root_private_baseline_is_checked_through_sudo(self):
        private_baseline = "/root/private/compose-target.json"
        self.request["compose_files"] = [private_baseline]
        REMOTE.activate(self.request, self.docker, lambda request, run: None)
        self.assertIn(["sudo", "-n", "test", "-f", private_baseline], self.calls)

    def test_isolated_runtime_refuses_activation_before_pins_or_restart(self):
        self.isolated = True
        with self.assertRaisesRegex(RuntimeError, "isolated"):
            REMOTE.activate(self.request, self.docker, lambda request, run: None)
        self.assertFalse(any("up" in args for args in self.calls))
        self.assertFalse((self.directory / "docker-compose.aws-frontend-images.yml").exists())

    def test_inactive_runtime_refuses_activation_before_pins_or_restart(self):
        self.active = False
        with self.assertRaisesRegex(RuntimeError, "not active"):
            REMOTE.activate(self.request, self.docker, lambda request, run: None)
        self.assertFalse(any("up" in args for args in self.calls))
        self.assertFalse((self.directory / "docker-compose.aws-frontend-images.yml").exists())

    def test_wrong_compose_container_name_fails_before_activation(self):
        def wrong(args):
            if "config" in args:
                return json.dumps({"name": "cleanapp-production", "services": {"cleanapp_frontend": {"container_name": "unexpected"}}})
            return self.docker(args)
        with self.assertRaisesRegex(ValueError, "name differs"):
            REMOTE.activate(self.request, wrong, lambda request, run: None)
        self.assertFalse(any("up" in args for args in self.calls))

    def test_wrong_compose_project_fails_before_activation(self):
        def wrong(args):
            if "container" in args and "{{json .Config.Labels}}" in args:
                return json.dumps({"com.docker.compose.project": "another-project", "com.docker.compose.service": "cleanapp_frontend"})
            return self.docker(args)
        with self.assertRaisesRegex(ValueError, "Compose project"):
            REMOTE.activate(self.request, wrong, lambda request, run: None)
        self.assertFalse(any("up" in args for args in self.calls))

    def test_incompatible_target_platform_fails_before_activation(self):
        with self.assertRaisesRegex(ValueError, "platform"):
            REMOTE.activate(self.request, lambda args: "aarch64", lambda request, run: None)
        self.assertFalse((self.directory / "docker-compose.aws-frontend-images.yml").exists())

    def test_failed_readiness_restores_previous_loaded_id_without_registry_pull(self):
        def fail(request, run):
            raise RuntimeError("not healthy")
        with self.assertRaisesRegex(RuntimeError, "previous loaded"):
            REMOTE.activate(self.request, self.docker, fail)
        pins = json.loads((self.directory / "docker-compose.aws-frontend-images.yml").read_text())["services"]
        self.assertEqual(pins["cleanapp_frontend"], {"image": OLD, "pull_policy": "never"})
        updates = [args for args in self.calls if "up" in args]
        self.assertEqual(len(updates), 2)
        self.assertTrue(all(args[args.index("--pull") + 1] == "never" for args in updates))

    def test_label_mismatch_fails_before_activation(self):
        def wrong_labels(args):
            if "image" in args and "{{json .Config.Labels}}" in args:
                return json.dumps({"org.opencontainers.image.revision": "b" * 40})
            return self.docker(args)
        with self.assertRaisesRegex(ValueError, "label mismatch"):
            REMOTE.activate(self.request, wrong_labels, lambda request, run: None)
        self.assertFalse(any("up" in args for args in self.calls))

    def test_failed_second_build_never_contacts_target(self):
        (self.directory / ".version").write_text("BUILD_VERSION=1.0.447\n")
        key = self.directory / "identity"
        known = self.directory / "known_hosts"
        key.touch()
        known.touch()
        def runner(args, **kwargs):
            self.calls.append(args)
            if args[:3] == ["git", "rev-parse", "HEAD"]:
                return SHA
            if args[:2] == ["git", "status"]:
                return ""
            if args[:2] == ["docker", "build"]:
                if "embedded" in args[args.index("--tag") + 1]:
                    raise RuntimeError("build failed")
                Path(args[args.index("--iidfile") + 1]).write_text(NEW)
                return ""
            raise AssertionError("Unexpected operation")
        env = {"NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "public-test", "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN": "public-test"}
        with mock.patch.object(CLIENT, "ROOT", self.directory), mock.patch.object(CLIENT, "stage_source", return_value=self.directory), mock.patch.object(CLIENT, "run", side_effect=runner), mock.patch.dict(os.environ, env), mock.patch.object(CLIENT.subprocess, "Popen") as export:
            with self.assertRaisesRegex(RuntimeError, "build failed"):
                CLIENT.main(["--execute", "--with-embedded", "--source-sha", SHA, "--host", "deployer@example.invalid", "--identity-file", str(key), "--known-hosts-file", str(known), "--remote-dir", str(self.directory), "--compose-files-json", json.dumps([str(self.baseline)])])
        export.assert_not_called()
        self.assertFalse(any(args[0] == "ssh" for args in self.calls))


if __name__ == "__main__":
    unittest.main()
