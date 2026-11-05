#!/usr/bin/env python3
"""Build frontend images on the runner and stream them to an explicit AWS host."""
import argparse
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = {
    "API_URL": "https://api.cleanapp.io", "LIVE_API_URL": "https://live.cleanapp.io",
    "TAGS_API_URL": "https://tags.cleanapp.io", "WEBSOCKET_LIVE_API_URL": "wss://live.cleanapp.io",
    "AUTH_API_URL": "https://auth.cleanapp.io", "AREAS_API_URL": "https://areas.cleanapp.io",
    "REPORT_PROCESSING_API_URL": "https://processing.cleanapp.io", "EMAIL_API_URL": "https://email.cleanapp.io",
    "RENDERER_API_URL": "https://renderer.cleanapp.io", "WEBSITE_URL": "https://www.cleanapp.io",
    "MONTENEGRO_API_URL": "https://apimontenegro.cleanapp.io", "DEVCONNECT2025_API_URL": "https://devconnect2025.cleanapp.io",
    "EDGE_CITY_API_URL": "https://apiedgecity.cleanapp.io", "NEW_YORK_API_URL": "https://apinewyork.cleanapp.io",
    "REDBULL_API_URL": "https://apiredbull.cleanapp.io", "REF_API_URL": "http://api.cleanapp.io:8080/write_referral",
    "REPORT_COUNT_URL": "http://api.cleanapp.io:8080/valid-reports-count",
    "PLAYSTORE_URL": "https://play.google.com/store/apps/details?id=com.cleanapp",
    "APPSTORE_URL": "https://apps.apple.com/us/app/cleanapp/id6466403301",
    "STRIPE_PUBLISHABLE_KEY": "", "MAPBOX_ACCESS_TOKEN": "", "GOOGLE_MAPS_API_KEY": "",
}


def run(args, **kwargs):
    strip_output = kwargs.pop("strip_output", True)
    result = subprocess.run(args, capture_output=True, text=True, check=False, **kwargs)
    if result.returncode:
        raise RuntimeError("Deployment command failed; private command diagnostics were not printed.")
    return result.stdout.strip() if strip_output else result.stdout


def ssh_command(args):
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.@:-]*", args.host):
        raise ValueError("An explicit SSH host is required")
    if not args.identity_file or not Path(args.identity_file).is_file() or not args.known_hosts_file or not Path(args.known_hosts_file).is_file():
        raise ValueError("SSH identity and pinned known-hosts files are required")
    return ["ssh", "-i", args.identity_file, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "IdentitiesOnly=yes", "-o", "UserKnownHostsFile=" + args.known_hosts_file, args.host]


def protocol_command(mode, request):
    script = base64.b64encode((ROOT / "scripts/aws-deploy-remote.py").read_bytes()).decode()
    bootstrap = "import base64;exec(compile(base64.b64decode(" + repr(script) + "),'<aws-frontend-deploy>','exec'))"
    payload = base64.b64encode(json.dumps(request).encode()).decode()
    return shlex.join(["python3", "-c", bootstrap, mode, payload])


def stage_source(directory, source_sha, version):
    """Exclude ignored/untracked runtime files by building an exact Git archive."""
    archive = directory / "source.tar"
    with archive.open("wb") as handle:
        result = subprocess.run(["git", "archive", "--format=tar", source_sha], cwd=ROOT,
                                stdout=handle, stderr=subprocess.DEVNULL, check=False)
    if result.returncode:
        raise RuntimeError("Could not stage the exact deployment source archive")
    context = directory / "source"
    context.mkdir()
    with tarfile.open(archive) as source:
        source.extractall(context, filter="data")
    (context / ".version").write_text("BUILD_VERSION=" + version + "\n")
    archive.unlink()
    return context


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Build/import/activate; otherwise print a read-only plan")
    parser.add_argument("--build-only", action="store_true")
    parser.add_argument("--with-embedded", action="store_true")
    parser.add_argument("--source-sha", default=os.environ.get("DEPLOY_SOURCE_SHA", ""))
    parser.add_argument("--metadata-file")
    parser.add_argument("--host", default=os.environ.get("AWS_DEPLOY_HOST", ""))
    parser.add_argument("--identity-file", default=os.environ.get("AWS_SSH_IDENTITY_FILE", ""))
    parser.add_argument("--known-hosts-file", default=os.environ.get("AWS_SSH_KNOWN_HOSTS_FILE", ""))
    parser.add_argument("--remote-dir", default=os.environ.get("AWS_DEPLOY_DIR", ""))
    parser.add_argument("--compose-files-json", default=os.environ.get("AWS_COMPOSE_FILES_JSON", ""))
    args = parser.parse_args(argv)
    modes = ["full", "embedded"] if args.with_embedded else ["full"]
    if not args.execute:
        print(json.dumps({"dry_run": True, "modes": modes, "platform": "linux/amd64", "transport": "SSH image archive", "registry_pull": False, "version_changed": False}))
        return 0
    if not re.fullmatch(r"[0-9a-f]{40}", args.source_sha):
        raise ValueError("Exact lowercase deployment event source SHA is required")
    if run(["git", "rev-parse", "HEAD"], cwd=ROOT) != args.source_sha:
        raise ValueError("Source HEAD must remain the exact deployment event SHA")
    dirty = run(["git", "status", "--porcelain"], cwd=ROOT, strip_output=False).splitlines()
    if any(line[3:] != ".version" for line in dirty):
        raise ValueError("Only deployment-owned .version may differ from source HEAD")
    ssh = None
    compose_files = []
    if not args.build_only:
        ssh = ssh_command(args)
        compose_files = json.loads(args.compose_files_json)
        if not isinstance(compose_files, list) or not compose_files or not all(isinstance(f, str) and Path(f).is_absolute() for f in compose_files):
            raise ValueError("Explicit absolute target Compose files are required")
        if not Path(args.remote_dir).is_absolute():
            raise ValueError("Explicit absolute target deployment directory is required")
    config = {"NEXT_PUBLIC_" + k: os.environ.get("NEXT_PUBLIC_" + k, v) for k, v in PUBLIC.items()}
    if not all(config[k] for k in ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN"]):
        raise ValueError("Existing public Stripe and Mapbox configuration must be supplied explicitly")
    version_file = ROOT / ".version"
    match = re.fullmatch(r"BUILD_VERSION=(\d+)\.(\d+)\.(\d+)\n", version_file.read_text())
    if not match:
        raise ValueError("Invalid deployment version")
    version = ".".join([match[1], match[2], str(int(match[3]) + 1)])
    version_file.write_text("BUILD_VERSION=" + version + "\n")
    manifest = {"source_sha": args.source_sha, "version": version, "environment": "prod", "build_only": args.build_only, "images": []}
    with tempfile.TemporaryDirectory(prefix="cleanapp-aws-build-") as temporary:
        directory = Path(temporary)
        context = stage_source(directory, args.source_sha, version)
        for mode in modes:
            mode_config = config | {"NEXT_PUBLIC_EMBEDDED_MODE": str(mode == "embedded").lower()}
            if mode == "embedded":
                mode_config["NEXT_PUBLIC_RENDERER_API_URL"] = "https://embed.cleanapp.io"
            tag = "cleanapp-frontend:aws-" + mode + "-" + version + "-" + args.source_sha[:12]
            iid = directory / (mode + ".iid")
            build = ["docker", "build", "--platform", "linux/amd64", "--file", "Dockerfile.aws", "--iidfile", str(iid), "--tag", tag, "--label", "org.opencontainers.image.revision=" + args.source_sha, "--label", "org.opencontainers.image.version=" + version]
            for name in mode_config:
                build += ["--build-arg", name]
            run(build + ["."], cwd=context, env=os.environ | mode_config)
            image_id = iid.read_text().strip()
            if not re.fullmatch(r"sha256:[0-9a-f]{64}", image_id):
                raise ValueError("Build did not produce an immutable image ID")
            manifest["images"].append({"mode": mode, "tag": tag, "image_id": image_id})
        if not args.build_only:
            archive = directory / "images.tar.gz"
            process = subprocess.Popen(["docker", "image", "save", *(image["image_id"] for image in manifest["images"])], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            with archive.open("wb") as handle, gzip.GzipFile(fileobj=handle, mode="wb", compresslevel=1) as zipped:
                shutil.copyfileobj(process.stdout, zipped, 1024 * 1024)
            process.stdout.close()
            if process.wait() != 0:
                raise RuntimeError("Image archive export failed; target was not touched")
            with archive.open("rb") as handle:
                digest = hashlib.file_digest(handle, "sha256").hexdigest()
            request = manifest | {"archive_sha256": digest, "compose_files": compose_files, "remote_dir": args.remote_dir}
            with archive.open("rb") as handle:
                result = subprocess.run(ssh + [protocol_command("receive", request)], stdin=handle, capture_output=True, check=False)
            if result.returncode:
                raise RuntimeError("Image import failed; target activation was not requested")
            deployed = json.loads(run(ssh + [protocol_command("activate", request)]))
            if deployed.get("source_sha") != args.source_sha or deployed.get("version") != version or deployed.get("images") != manifest["images"]:
                raise RuntimeError("Target returned mismatched deployment identity")
            manifest.update(archive_sha256=digest, deployed=True)
    if args.metadata_file:
        path = Path(args.metadata_file)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(manifest, indent=2) + "\n")
        path.chmod(0o600)
    print(json.dumps(manifest, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        # Validation messages are safe; subprocess output and config values are not echoed.
        print(str(exc) if isinstance(exc, (ValueError, RuntimeError)) else "AWS frontend deployment failed.", file=sys.stderr)
        raise SystemExit(1)
