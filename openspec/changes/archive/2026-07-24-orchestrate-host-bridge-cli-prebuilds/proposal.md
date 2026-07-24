## Why

The repository has a seven-platform Host Bridge CLI prebuild workflow and an
append-only prebuild branch, but the developer-facing command still performs
only a single-platform local build. Operators must manually dispatch a
workflow, guess which run belongs to the request, recover its identity, and
then synchronize binaries using local release metadata that may already be
stale. That gap makes feature-branch validation error-prone and weakens the
evidence boundary between a build-only prebuild and an authorized Host Bridge
publication.

## What Changes

- Change `prebuild:zotero-bridge-cli` into a build-only orchestrator for the
  current pushed branch and exact source commit.
- Preserve the existing local single-platform build as
  `build:local:zotero-bridge-cli`.
- Add one shared GitHub workflow-run helper for request-id generation, exact
  run matching, watching, artifact download, and recovery.
- Require the prebuild workflow to accept a request id and upload a structured
  result binding source SHA, CLI version, build fingerprint, aggregate,
  prebuild-branch commit, and immutable set path.
- Make prebuild synchronization consume that explicit result identity and
  stage all seven archives before replacing `addon/bin` or release manifests.
- Keep feature-branch prebuilds build-only. Formal Host Bridge publication
  remains restricted to a clean synchronized `main`, an exact prepared release
  set, and explicit dispatch authorization.
- Update the Host Bridge release Skill with the exact command and
  `--resume-run-id` recovery path without deleting or compressing existing
  guidance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `host-bridge-release-pipeline`: Add an exact, recoverable development-branch
  prebuild orchestration path that remains isolated from publication.
- `host-bridge-cli-interface`: Define the command split, structured prebuild
  result, identity checks, and atomic seven-platform synchronization contract.

## Impact

The change affects repository scripts, the Host Bridge CLI prebuild workflow,
CLI packaging/release-script tests, package commands, Host Bridge release
guidance, and OpenSpec contracts. It does not publish any Host Bridge surface,
change CLI source or build recipes, select or bump versions, commit or push
source changes, trigger Gitee synchronization, or alter the append-only
prebuild storage layout.
