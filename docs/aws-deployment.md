# Portable AWS frontend deployment

The manual production workflow builds x86 images from an exact source-commit Git archive on its GitHub runner and sends a compressed Docker image archive over authenticated SSH. The only archive adjustment is the deployment-owned allocated `.version`; ignored and untracked runtime files cannot enter the build context. The receiver checks its checksum, verifies loaded image IDs and source/version labels, then updates only an already-running selected frontend service with `--no-deps --no-build --pull never`. It retains the target Compose environment, ports, networks and acquisition-event bind mounts.

Required repository variables:

- `AWS_DEPLOY_HOST`: explicit `user@host`; no source-host fallback.
- `AWS_DEPLOY_DIR`: absolute deployer-owned target state directory for release manifests and managed pins, separate from root-private runtime files.
- `AWS_COMPOSE_FILES_JSON`: JSON array of absolute target baseline/runtime Compose files in merge order, initially `["/opt/cleanapp/private/compose-target.json"]` from the exact 31 running containers. Do not list either managed `docker-compose.aws-*-images.yml` file here; both coordinators reject them. Missing listed files fail closed. The helper automatically includes an existing backend pin file and always places its own frontend pin file last so immutable image selection takes precedence.
- `AWS_DEPLOY_SSH_KNOWN_HOSTS`: independently verified host-key entries.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: existing public browser key.
- `AWS_EC2_SECURITY_GROUP_ID`: exact reviewed production EC2 security group ID; no source-host or world-SSH fallback.
- `AWS_DEPLOY_ROLE_ARN`: narrow GitHub OIDC role used only to manage runner SSH ingress on the reviewed EC2 security group.

Repository secrets are `AWS_DEPLOY_SSH_PRIVATE_KEY` for a restricted deployment identity and existing public browser `MAPBOX_ACCESS_TOKEN`. `GOOGLE_MAPS_API_KEY` is an optional transitional public build input; this workflow never fetches it from GCP. Existing paid Google routes and old-client behavior must be addressed before billing retirement. Keeping a key here does not meet the zero-GCP objective.

Private runtime credentials remain in restricted host files. The workflow uses temporary OIDC credentials for firewall access, the SSH deployment key for host access, and no stored AWS access key or GCP service-account credential. Do not disable host-key checks or place private configuration into browser build arguments.

The runner uses Python 3.12. The target needs Docker/Compose, Python 3, noninteractive sudo access to Docker and `test -f`, and the selected frontend roles already running. This updates current production roles; it does not bootstrap or start dormant services. The default is full frontend only; manual workflow input can also update the existing embedded role. No dev host is created.

`Dockerfile.aws` uses Node 22 to match existing CI and base-image definitions. The real Linux smoke caught newer npm lockfile validation under Node 24; this migration keeps application dependencies and the lockfile unchanged.

Activation takes an exclusive advisory lock on `/opt/cleanapp/deploy/.deployment-and-backup.lock`, shared with weekly backup and cold restore. The deployer-owned parent must not be group/world writable; the lock must be a non-symlink, single-link regular file owned by the deployer with mode `0600`. Existing lock ownership/mode/inode are preserved. The lock covers pin inspection, restart, readiness and rollback, and releases on exceptions; runner builds and SSH archive upload do not hold it.

Activation also requires `/etc/cleanapp-runtime/ACTIVE` to be a regular non-symlink file and `/etc/cleanapp-runtime/ISOLATED` to be absent, including dangling symlinks. Sudo must allow the helper's `test -f`, `test ! -e` and `test ! -L` checks. A queued GitHub run cannot bypass the migration/restore one-writer fence.

Pins live in `docker-compose.aws-frontend-images.yml` as JSON/YAML with `pull_policy: never`. Backend pins use `docker-compose.aws-backend-images.yml`. Reboot/watchdog/runbook Compose commands must include both after the portable baseline; never broadly apply historical source manifests to recreate dormant roles.

Before activation the helper records old image IDs. A failed start or local readiness probe restores those loaded IDs. Successful release manifests contain only source SHA, version, IDs/tags, archive checksum and prior IDs; resolved runtime environments are never exported. Coordinate database rollback separately with the migration data boundary.

Version allocation remains deployment-owned: seed current `.version`, increment once after preflight, and let existing `deploy-version.py publish` reconcile only the consumed version after deployment. Do not edit `.version` in implementation commits. Concurrency, exact source checkout, smoke checks and IndexNow are retained. Deployment is manual from main during migration, so a workflow-only merge does not rebuild captured production images. Embedded updates require the explicit manual input.

The historical `fastFEdeploy.sh` is no longer invoked by active CI. It still contains GCP commands and must not be used after retirement. Retire its old triggers, GCP permissions and `GCP_SA_KEY` authorization once replacement is validated.

`python3 scripts/aws-deploy.py` prints a read-only plan. `--execute --build-only --source-sha <event-sha>` builds without host access. A real update additionally requires explicit SSH/host/Compose configuration. Build arguments are existing public `NEXT_PUBLIC_*` configuration only; private Docker/Compose diagnostics are not printed.

Both build-only and production runs export images by their exact build tags, then derive each portable `image_id` from the SHA256 of the raw config bytes referenced by Docker-save's `manifest.json`. The archive must contain exactly the selected tags and matching linux/amd64 configs with the expected source and version labels. The runner's original build ID is retained separately as `runner_image_id`: Docker's containerd and classic image stores can report different IDs for the same image. The target still requires the imported and running image IDs to equal the verified config digest exactly.

For a real Linux image-build smoke before merge, run the existing workflow on the PR branch with `build_only=true`. That separate job has only repository read permission, uses public placeholders with API endpoints on localhost, and builds the full frontend image without SSH, OIDC or any AWS calls. It never starts application containers or publishes `.version`. The production job remains main-only and is excluded when `build_only` is selected. Embedded production remains unchanged unless explicitly selected in a later production deployment.

## Runner ingress without public SSH

The workflow is restricted to `refs/heads/main`. Its OIDC role must trust audience `sts.amazonaws.com` and exact subject `repo:cleanappio/cleanapp-frontend:ref:refs/heads/main`. The GitHub read-only customization API currently reports default legacy subjects with immutable subjects disabled. Recheck that setting if the repository changes it; do not widen trust with wildcards or an environment subject.

Grant `ec2:AuthorizeSecurityGroupIngress` and `ec2:RevokeSecurityGroupIngress` only on the verified production security group ARN in `us-east-2`. Grant `ec2:DescribeSecurityGroups` and `ec2:DescribeSecurityGroupRules` on `Resource: "*"`, constrained with `aws:RequestedRegion: us-east-2`, because those read actions have no resource-level support. The role can change inbound rules on that one group; the reviewed helper enforces exact TCP 22, one discovered public IPv4 `/32`, region and account. It never replaces all security-group rules or changes outbound access.

The helper writes its restricted state before authorization and records the returned immutable `SecurityGroupRuleId`. An `always()` sequence refreshes the same one-hour OIDC role, removes only this run's owned rule IDs, and verifies removal. Existing operator/foreign rules and replacement rules with the same CIDR are never deleted. An uncertain API response can be reconciled through the unique run description before claiming a rule. A hard runner termination can prevent cleanup: use the recorded rule ID/run marker and CloudTrail role session run-ID to remove that exact rule privately. A same-egress duplicate borrows existing access without claiming it, so serialize shared-NAT runs if encountered; distinct public runner `/32`s have independent owned rules.

References: [EC2 security-group authorization](https://docs.aws.amazon.com/service-authorization/latest/reference/list_ec2.html), [authorize ingress](https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html), [revoke by immutable rule ID](https://docs.aws.amazon.com/cli/latest/reference/ec2/revoke-security-group-ingress.html), and [GitHub OIDC trust](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws).
