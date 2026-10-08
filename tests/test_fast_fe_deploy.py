"""Exercise the release coordinator with a fake cloud client; no remote writes."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SHA = "a" * 40
MOCK_GCLOUD = r'''#!/usr/bin/env python3
import json, os, pathlib, sys
args = sys.argv[1:]
directory = pathlib.Path(os.environ["MOCK_DIRECTORY"])
with (directory / "calls.jsonl").open("a") as handle:
    handle.write(json.dumps(args) + "\n")
if args[:3] == ["secrets", "versions", "access"]:
    print("mock-public-client-config")
elif args[:2] == ["builds", "submit"]:
    tag = next(a.split("=", 1)[1] for a in args if a.startswith("--tag="))
    mode = "embedded" if "image-embedded:" in tag else "full"
    (directory / (mode + ".Dockerfile")).write_text(pathlib.Path("Dockerfile").read_text())
    if mode == "embedded" and os.environ.get("MOCK_FAIL_EMBEDDED"):
        raise SystemExit(2)
    digest = "sha256:" + ("2" if mode == "embedded" else "1") * 64
    record = {"id": mode + "-build", "status": "SUCCESS", "source": {"storageSource": {"bucket": "mock-source", "object": mode + ".tgz", "generation": "1"}}, "results": {"images": [{"name": tag, "digest": digest}]}}
    (directory / (mode + "-build.json")).write_text(json.dumps(record))
    print(record["id"])
elif args[:2] == ["builds", "describe"]:
    record = json.loads((directory / (args[2] + ".json")).read_text())
    if os.environ.get("MOCK_EXTRA_IMAGE"):
        record["results"]["images"].insert(0, {"name": "example.invalid/unrelated:tag", "digest": "sha256:" + "3" * 64})
    if os.environ.get("MOCK_INVALID_DIGEST"):
        record["results"]["images"][0]["digest"] = "not-an-immutable-digest"
    print(json.dumps(record))
elif args[:4] == ["artifacts", "docker", "tags", "add"]:
    pass
elif args[:2] == ["compute", "ssh"]:
    pass
else:
    raise SystemExit("Unexpected cloud operation")
'''


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        for name in ("fastFEdeploy.sh", "Dockerfile.template.fast", ".version"):
            shutil.copyfile(ROOT / name, self.directory / name)
        (self.directory / ".version").write_text("BUILD_VERSION=1.0.421\n")
        self.bin = self.directory / "bin"
        self.bin.mkdir()
        mock = self.bin / "gcloud"
        mock.write_text(MOCK_GCLOUD)
        mock.chmod(0o755)
        self.environment = os.environ.copy()
        self.environment.update(PATH=str(self.bin) + os.pathsep + self.environment["PATH"], MOCK_DIRECTORY=str(self.directory))

    def run_release(self, *args, extra_env=None, source_sha=SHA):
        env = self.environment | (extra_env or {})
        return subprocess.run(["bash", "fastFEdeploy.sh", "-e", "prod", "--source-sha", source_sha, "--metadata-file", str(self.directory / "manifest.json"), *args], cwd=self.directory, env=env, capture_output=True, text=True)

    def calls(self):
        path = self.directory / "calls.jsonl"
        return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []

    def test_build_only_two_images_has_no_promotion_or_runtime_calls(self):
        result = self.run_release("--build-only", "--with-embedded")
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.calls()
        self.assertEqual(sum(call[:2] == ["builds", "submit"] for call in calls), 2)
        self.assertFalse(any(call[0] in ("artifacts", "compute", "config") for call in calls))
        self.assertTrue(all("--project=cleanup-mysql-v2" in call for call in calls))
        manifest = json.loads((self.directory / "manifest.json").read_text())
        self.assertEqual(manifest["source_sha"], SHA)
        self.assertEqual(manifest["version"], "1.0.422")
        self.assertTrue(manifest["build_only"])
        self.assertEqual([image["mode"] for image in manifest["images"]], ["full", "embedded"])
        for image in manifest["images"]:
            self.assertIn("@sha256:", image["image"])
            self.assertEqual(image["source"]["storageSource"]["bucket"], "mock-source")
        for mode, embedded in (("full", "false"), ("embedded", "true")):
            dockerfile = (self.directory / (mode + ".Dockerfile")).read_text()
            self.assertIn('org.opencontainers.image.revision="' + SHA + '"', dockerfile)
            self.assertIn('org.opencontainers.image.version="1.0.422"', dockerfile)
            self.assertIn("ENV NEXT_PUBLIC_EMBEDDED_MODE=" + embedded, dockerfile)
            self.assertNotIn("{{", dockerfile)
        self.assertNotIn("mock-public-client-config", result.stdout)
        self.assertFalse((self.directory / "Dockerfile").exists())

    def test_build_only_defaults_to_main_image(self):
        result = self.run_release("--build-only", source_sha=SHA.upper())
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.directory / "manifest.json").read_text())
        self.assertEqual(manifest["source_sha"], SHA)
        self.assertEqual([image["mode"] for image in manifest["images"]], ["full"])
        self.assertFalse(any(call[0] in ("artifacts", "compute") for call in self.calls()))

    def test_manifest_uses_validated_image_when_build_returns_multiple_images(self):
        result = self.run_release("--build-only", "--with-embedded", extra_env={"MOCK_EXTRA_IMAGE": "1"})
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.directory / "manifest.json").read_text())
        self.assertEqual([image["digest"] for image in manifest["images"]], ["sha256:" + "1" * 64, "sha256:" + "2" * 64])
        self.assertTrue(all(image["image"].startswith("us-central1-docker.pkg.dev/cleanup-mysql-v2/") for image in manifest["images"]))

    def test_deploy_waits_for_all_builds_and_uses_digest(self):
        result = self.run_release("--with-embedded")
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.calls()
        last_build = max(index for index, call in enumerate(calls) if call[:2] == ["builds", "describe"])
        promotions = [index for index, call in enumerate(calls) if call[0] in ("artifacts", "compute")]
        self.assertEqual(len(promotions), 4)
        self.assertTrue(all(index > last_build for index in promotions))
        for call in calls:
            if call[:2] == ["compute", "ssh"]:
                command = next(arg for arg in call if arg.startswith("--command="))
                self.assertIn("sudo docker pull us-central1-docker.pkg.dev/cleanup-mysql-v2/", command)
                self.assertIn("@sha256:", command)
                self.assertNotIn("image:prod", command)
                self.assertIn("--network deployer_default", command)

    def test_second_build_failure_does_not_promote_first_image(self):
        result = self.run_release("--with-embedded", extra_env={"MOCK_FAIL_EMBEDDED": "1"})
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(call[0] in ("artifacts", "compute") for call in self.calls()))
        self.assertFalse((self.directory / "manifest.json").exists())
        self.assertFalse((self.directory / "Dockerfile").exists())

    def test_invalid_digest_fails_without_promotion(self):
        result = self.run_release(extra_env={"MOCK_INVALID_DIGEST": "1"})
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(call[0] in ("artifacts", "compute") for call in self.calls()))

    def test_invalid_source_sha_fails_before_cloud_access(self):
        for value in ("a" * 39, "g" * 40, "a" * 41):
            with self.subTest(value=value):
                result = self.run_release("--build-only", source_sha=value)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("40 hexadecimal characters", result.stderr)
        self.assertEqual(self.calls(), [])
        self.assertEqual((self.directory / ".version").read_text(), "BUILD_VERSION=1.0.421\n")

    def test_existing_dockerfile_is_preserved(self):
        (self.directory / "Dockerfile").write_text("original\n")
        result = self.run_release("--build-only")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls(), [])
        self.assertEqual((self.directory / "Dockerfile").read_text(), "original\n")


if __name__ == "__main__":
    unittest.main()
