#!/usr/bin/env python3
"""Restricted image import/activation protocol; sent over authenticated SSH."""
import base64
import contextlib
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import time
import urllib.request

ROLES = {"full": ("cleanapp_frontend", 3001), "embedded": ("cleanapp_frontend_embedded", 3002)}
ID = re.compile(r"sha256:[0-9a-f]{64}\Z")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def command(args):
    result = subprocess.run(args, capture_output=True, text=True, check=False)
    if result.returncode:
        # Compose diagnostics can contain resolved runtime configuration.
        raise RuntimeError("Target command failed; private diagnostics were not printed.")
    return result.stdout.strip()


def validate_request(request):
    if not re.fullmatch(r"[0-9a-f]{40}", request["source_sha"]):
        raise ValueError("Invalid source SHA")
    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", request["version"]):
        raise ValueError("Invalid build version")
    directory = Path(request["remote_dir"])
    if not directory.is_absolute():
        raise ValueError("Deployment directory must be absolute")
    files = request["compose_files"]
    if not isinstance(files, list) or not files or not all(isinstance(f, str) and Path(f).is_absolute() for f in files):
        raise ValueError("Explicit absolute Compose files are required")
    managed = {"docker-compose.aws-frontend-images.yml", "docker-compose.aws-backend-images.yml"}
    if any(Path(file).name in managed for file in files):
        raise ValueError("Managed image pins must not be supplied as baseline Compose files")
    modes = [image["mode"] for image in request["images"]]
    if not modes or len(modes) != len(set(modes)) or any(m not in ROLES for m in modes):
        raise ValueError("Only selected frontend roles may be updated")
    if any(not ID.fullmatch(image["image_id"]) for image in request["images"]):
        raise ValueError("Every image must have an immutable Docker image ID")
    if not re.fullmatch(r"[0-9a-f]{64}", request["archive_sha256"]):
        raise ValueError("Invalid archive checksum")
    return directory


def receive(request, stream):
    validate_request(request)
    docker = ["sudo", "-n", "docker"]
    with tempfile.NamedTemporaryFile(prefix="cleanapp-frontend-", suffix=".tar.gz") as archive:
        os.chmod(archive.name, 0o600)
        digest = hashlib.sha256()
        while True:
            chunk = stream.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
            archive.write(chunk)
        archive.flush()
        if digest.hexdigest() != request["archive_sha256"]:
            raise ValueError("Image archive checksum mismatch; nothing imported")
        command(docker + ["image", "load", "--input", archive.name])
    for image in request["images"]:
        if command(docker + ["image", "inspect", "--format", "{{.Id}}", image["image_id"]]) != image["image_id"]:
            raise ValueError("Imported image identity mismatch")
    return {"imported": True, "archive_sha256": request["archive_sha256"]}


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False, encoding="utf-8") as handle:
        temporary = Path(handle.name)
        os.chmod(temporary, 0o600)
        json.dump(value, handle, indent=2)
        handle.write("\n")
    temporary.replace(path)


@contextlib.contextmanager
def deployment_lock(directory):
    """Share one stable private inode with weekly backup and cold restore."""
    directory = Path(directory)
    if not directory.is_absolute():
        raise ValueError("Deployment lock parent must be absolute")
    parent = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC)
    descriptor = None
    try:
        info = os.fstat(parent)
        if info.st_uid != os.geteuid() or info.st_mode & 0o022:
            raise ValueError("Deployment lock parent must be deployer-owned and not publicly writable")
        name = ".deployment-and-backup.lock"
        descriptor = os.open(name, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600, dir_fd=parent)
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) != 0o600:
            raise ValueError("Deployment lock must be a private single-link deployer-owned regular file")
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        current = os.stat(name, dir_fd=parent, follow_symlinks=False)
        if (current.st_dev, current.st_ino) != (info.st_dev, info.st_ino):
            raise ValueError("Deployment lock inode changed while waiting")
        try:
            yield
        finally:
            fcntl.flock(descriptor, fcntl.LOCK_UN)
    finally:
        if descriptor is not None:
            os.close(descriptor)
        os.close(parent)


def require_active_runtime(run):
    """A CI trigger must not bypass the one-writer migration/restore fence."""
    isolated = "/etc/cleanapp-runtime/ISOLATED"
    active = "/etc/cleanapp-runtime/ACTIVE"
    run(["sudo", "-n", "test", "!", "-e", isolated])
    run(["sudo", "-n", "test", "!", "-L", isolated])
    run(["sudo", "-n", "test", "-f", active])
    run(["sudo", "-n", "test", "!", "-L", active])


def activate(request, run=command, ready=None):
    directory = validate_request(request)
    with deployment_lock(directory):
        require_active_runtime(run)
        return _activate_locked(request, run, ready)


def _activate_locked(request, run=command, ready=None):
    directory = validate_request(request)
    docker = ["sudo", "-n", "docker"]
    if run(docker + ["info", "--format", "{{.Architecture}}"]) not in {"x86_64", "amd64"}:
        raise ValueError("Target must match the linux/amd64 image platform")
    pin_file = directory / "docker-compose.aws-frontend-images.yml"
    # Keep the other coordinator's pins and apply our immutable IDs last.
    compose_files = list(request["compose_files"])
    backend_pin = directory / "docker-compose.aws-backend-images.yml"
    if backend_pin.is_file() and str(backend_pin) not in compose_files:
        compose_files.append(str(backend_pin))
    compose_files.append(str(pin_file))
    for file in request["compose_files"]:
        # The captured runtime baseline may remain in a root-only directory.
        run(["sudo", "-n", "test", "-f", file])
    base = docker + ["compose", "--project-directory", str(directory)]
    config_command = list(base)
    for file in compose_files:
        if file != str(pin_file) or pin_file.exists():
            config_command += ["-f", file]
    # Resolved private runtime values stay in memory and are never logged.
    resolved = json.loads(run(config_command + ["config", "--format", "json"]))
    previous = json.loads(pin_file.read_text()) if pin_file.exists() else {"services": {}}
    pins = dict(previous.get("services", {}))
    allowed = {role for role, _ in ROLES.values()}
    if set(pins) - allowed or any(not ID.fullmatch(v.get("image", "")) for v in pins.values()):
        raise ValueError("Unexpected persistent frontend image-pin contents")
    old_images = {}
    services = []
    for image in request["images"]:
        role, _ = ROLES[image["mode"]]
        if resolved.get("services", {}).get(role, {}).get("container_name") != role:
            raise ValueError("Selected frontend name differs from the target Compose baseline")
        if run(docker + ["container", "inspect", "--format", "{{.State.Running}}", role]) != "true":
            raise ValueError("Refusing to activate an absent or dormant frontend role")
        labels = json.loads(run(docker + ["container", "inspect", "--format", "{{json .Config.Labels}}", role]))
        if labels.get("com.docker.compose.project") != resolved.get("name") or labels.get("com.docker.compose.service") != role:
            raise ValueError("Selected frontend does not belong to the configured Compose project")
        old = run(docker + ["container", "inspect", "--format", "{{.Image}}", role])
        if not ID.fullmatch(old):
            raise ValueError("Invalid previous image identity")
        if run(docker + ["image", "inspect", "--format", "{{.Id}}", image["image_id"]]) != image["image_id"]:
            raise ValueError("Desired image is not loaded")
        labels = json.loads(run(docker + ["image", "inspect", "--format", "{{json .Config.Labels}}", image["image_id"]]))
        if labels.get("org.opencontainers.image.revision") != request["source_sha"] or labels.get("org.opencontainers.image.version") != request["version"]:
            raise ValueError("Image source/version label mismatch")
        old_images[role] = old
        services.append(role)
        pins[role] = {"image": image["image_id"], "pull_policy": "never"}
    compose = list(base)
    for file in compose_files:
        compose += ["-f", file]
    new_pins = {"services": pins}
    rollback_pins = {"services": dict(pins)}
    for role, old in old_images.items():
        rollback_pins["services"][role] = {"image": old, "pull_policy": "never"}
    atomic_json(pin_file, new_pins)
    up = compose + ["up", "-d", "--no-deps", "--no-build", "--pull", "never", *services]
    try:
        run(up)
        if ready is None:
            ready = wait_ready
        ready(request, run)
    except Exception:
        # Keep previous loaded IDs pinned; reverting to a registry tag could pull GCP.
        atomic_json(pin_file, rollback_pins)
        try:
            run(up)
        except Exception as exc:
            raise RuntimeError("Frontend activation and rollback failed; inspect the host privately.") from exc
        raise RuntimeError("Frontend activation failed; previous loaded image IDs were restored.")
    release = {"source_sha": request["source_sha"], "version": request["version"], "images": request["images"], "previous_images": old_images, "archive_sha256": request["archive_sha256"]}
    atomic_json(directory / "aws-deploy" / ("frontend-" + request["version"] + "-" + request["source_sha"][:12] + ".json"), release)
    return {"deployed": True, **release}


def wait_ready(request, run):
    deadline = time.monotonic() + 120
    remaining = {image["mode"] for image in request["images"]}
    while remaining and time.monotonic() < deadline:
        for mode in list(remaining):
            role, port = ROLES[mode]
            try:
                docker = ["sudo", "-n", "docker", "container", "inspect", "--format"]
                running = run(docker + ["{{.State.Running}}", role])
                expected = next(image["image_id"] for image in request["images"] if image["mode"] == mode)
                if run(docker + ["{{.Image}}", role]) != expected:
                    continue
                # A redirect to the old public host must not prove target readiness.
                with urllib.request.build_opener(NoRedirect()).open("http://127.0.0.1:" + str(port) + "/", timeout=3) as response:
                    if running == "true" and response.status == 200:
                        # A healthy homepage does not prove that server-only Places credentials work.
                        with urllib.request.build_opener(NoRedirect()).open("http://127.0.0.1:" + str(port) + "/api/geocode?lat=47.3769&lng=8.5417", timeout=10) as location:
                            data = json.load(location)
                            if location.status == 200 and data.get("success") is True and data.get("provider") == "amazon-location" and isinstance(data.get("address"), str) and data["address"]:
                                remaining.remove(mode)
            except Exception:
                pass
        if remaining:
            time.sleep(2)
    if remaining:
        raise RuntimeError("Target frontend did not become ready")


def main():
    try:
        mode = sys.argv[1]
        request = json.loads(base64.b64decode(sys.argv[2], validate=True))
        if mode == "receive":
            result = receive(request, sys.stdin.buffer)
        elif mode == "activate":
            result = activate(request)
        else:
            raise ValueError("Invalid protocol mode")
        print(json.dumps(result, sort_keys=True))
        return 0
    except Exception:
        # Do not print subprocess output, resolved Compose env or request values.
        print("AWS frontend import/activation failed; inspect the target privately.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
