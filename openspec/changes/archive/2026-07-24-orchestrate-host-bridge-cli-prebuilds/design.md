## Context

`build-host-bridge-cli-prebuilds.yml` already builds seven desktop targets and
publishes content-addressed sets to `host-bridge-cli-prebuilds`.
`sync-host-bridge-cli-prebuilds.ts` can restore a set, but it derives identity
from local release metadata. The current `prebuild:zotero-bridge-cli` command
does not connect those operations, while Host Bridge and content-package
dispatch scripts each contain their own GitHub run discovery and watch logic.

The build-only command must work from a development branch without weakening
the formal release controller. It must also fail before local mutation when
the source commit, workflow result, remote set, archives, or identity envelope
do not agree.

## Goals / Non-Goals

**Goals:**

- Dispatch and recover one exact prebuild workflow run for one pushed commit.
- Bind every step to an explicit request id and full source SHA.
- Download a machine-readable result artifact and use it as the synchronization
  identity.
- Replace local binaries and manifests only after all seven remote archives
  have been verified in staging.
- Reuse one GitHub workflow helper from all repository dispatch scripts.
- Preserve formal release isolation and the existing local build path.

**Non-Goals:**

- Automatically choosing or bumping the CLI version.
- Committing, pushing, publishing Host Bridge surfaces, or syncing Gitee.
- Changing Rust build inputs, target definitions, archive formats, or the
  append-only branch layout.
- Treating a mutable latest workflow run or local aggregate as identity.

## Decisions

### 1. Require a synchronized attached source branch

The orchestrator accepts `--repo`, `--ref`, `--source-sha`, and
`--resume-run-id`. Defaults are the current repository, attached branch, and
`HEAD`. Before dispatch it requires a clean tree, an upstream branch, a pushed
`HEAD`, and equality between `HEAD`, upstream, and the requested source SHA.
An explicit ref must resolve to the same pushed commit.

Resume skips dispatch but still verifies that the selected run belongs to the
prebuild workflow and exact request identity recovered from its structured
result.

### 2. Keep version identity pre-locked

`Cargo.toml` remains the CLI version SSOT. The checked-in release manifest must
already record the same version and current build fingerprint before the
orchestrator dispatches. The command never edits Cargo metadata or selects a
release intent.

### 3. Match workflow runs by request id

The shared helper generates a collision-resistant request id, passes it as a
required workflow input, and locates only a run whose workflow, source SHA, ref,
and run name contain that id. It never selects the latest run heuristically.
Watching and failure reporting preserve the run id so `--resume-run-id` can
continue without dispatching again.

### 4. Treat the result artifact as the synchronization authority

The workflow uploads `host-bridge-cli-prebuild-result.v1` after the immutable
set is present on the prebuild branch. The result binds repository, workflow
run, request id, source SHA, ref, CLI version, build fingerprint, aggregate,
prebuild branch commit, and `sets/<aggregate>` path.

Synchronization accepts `--identity-file=<result.json>`, validates the complete
schema, fetches the named branch commit and set path, verifies the remote
manifest and all seven archives against that identity, and ignores a stale
aggregate in the local release manifest.

### 5. Stage before replacing local state

All remote files are downloaded into a temporary directory outside
`addon/bin`, extracted, and verified before mutation. Only then are the seven
platform directories replaced and release manifests recalculated. Validation
or remote write failures leave existing local binaries and manifests
unchanged.

### 6. Share GitHub workflow mechanics

`github-workflow-run.ts` owns request ids, dispatch, exact run lookup, watch,
run validation, and artifact download. Host Bridge release dispatch and
content-package preparation use the same primitives while preserving their
existing inputs and authorization gates.

### 7. Preserve semantic guidance

The Host Bridge release Skill baseline is
`1f27ba34c890678e4f158fc90b4f507338ae2ed9`. The approved deletion inventory is
empty. Existing instruction order and depth remain intact; the new build-only
command and recovery evidence are added beside the current prebuild decision
and failure handling.

## Risks / Trade-offs

- [GitHub API latency delays run discovery] -> Poll only for the exact request
  id with a bounded timeout and retain the request id for recovery.
- [A completed run uploads a missing or malformed result] -> Fail before sync
  and report the run and expected artifact name.
- [Local release metadata is stale] -> Use the result artifact for remote
  identity, then regenerate local manifests from verified bytes.
- [Cross-device rename cannot be atomic] -> Stage within the repository's
  filesystem and use rollback-safe directory swaps only after verification.
- [Shared helper migration changes existing dispatch behavior] -> Preserve
  command-specific gates and add focused regression tests for inputs, exact
  matching, watch, and recovery.

## Migration Plan

1. Add focused failing tests for gates, exact run matching, result validation,
   resume, and atomic synchronization.
2. Add the shared workflow helper and migrate existing dispatch callers.
3. Add the prebuild orchestrator and structured workflow result.
4. Harden synchronization and recalculate release manifests after success.
5. Update package commands and Host Bridge release guidance.
6. Run focused tests, OpenSpec validation, CLI freshness, and Host Bridge
   semantic/content gates without dispatching the remote workflow.

## Open Questions

None.
