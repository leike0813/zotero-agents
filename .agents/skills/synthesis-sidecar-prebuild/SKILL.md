---
name: synthesis-sidecar-prebuild
description: Dispatch or resume an exact seven-platform Synthesis sidecar prebuild and synchronize its verified content-addressed set. Use when a pushed source identity needs prebuild evidence before a governed sidecar release.
---

# Synthesis Sidecar Prebuild

## Goal

Produce one exact, seven-platform native sidecar prebuild set for a locked
source commit. This is build-only work. It does not prepare a release set,
materialize plugin files, commit source changes, publish a plugin, or run a
Gitee synchronization.

## Required inputs

- An attached branch with a configured upstream.
- A clean worktree and the exact full 40-character source SHA.
- The repository and branch that resolve to that source SHA.
- A successful trusted `synthesis-sidecar-verification-result.v1` receipt whose
  verification fingerprint and pipeline revision match the candidate.
- An explicit user authorization for a new remote dispatch.
- For recovery, the exact existing GitHub Actions run ID and request ID.

## Target identity

The set always includes these targets, once each:

- `win32-x64`
- `darwin-x64`
- `darwin-arm64`
- `linux-x86`
- `linux-x64`
- `linux-arm`
- `linux-arm64`

The prebuild branch is `synthesis-sidecar-runtime-prebuilds`. A set lives at
`sets/<aggregate>/`; it is immutable evidence, never a mutable release tag.

## Inspect before any action

1. Read the source SHA with `git rev-parse HEAD`.
2. Read the current branch with `git branch --show-current`.
3. Inspect `git status --porcelain`; stop if it is nonempty.
4. Fetch the requested upstream ref and compare it with the requested source
   SHA. The SHA must be full, current, and exact.
5. Read all four identities using the release-governance helper: source
   fingerprint, build fingerprint, verification fingerprint, and pipeline
   revision.
6. Resolve the trusted Linux/Windows/macOS verification receipt. It must come
   from a same-repository `push` or `workflow_dispatch`. A receipt from another
   SHA is valid only when both governed verification identities match.
7. Record repository, ref, source SHA, request ID, receipt run, and intended
   command.

Do not create a commit, push a branch, select a version, or change a source
file in order to make these checks pass.

## Classify the request

Use one of the following paths:

1. A developer needs a local native binary: use the normal local Rust build.
   This is not seven-platform evidence.
2. A user explicitly authorizes a new seven-platform build: dispatch
   `prebuild-synthesis-sidecar-runtime.yml` once with exact `source_sha` and
   `request_id` inputs.
3. A known run already exists and observation or synchronization stopped:
   resume the same run and reuse its original result artifact. Do not dispatch
   a replacement run.

## Artifact candidate reuse

The workflow searches non-expired artifacts from prior runs of the same
prebuild workflow, including runs at another source SHA. Discovery produces a
candidate, not a trusted cache hit. Each target job downloads and validates the
candidate before deciding whether to build.

- Reuse requires exact source fingerprint, build fingerprint, target, closed
  bundle manifest, archive layout, file inventory, size, and SHA-256.
- Missing, expired, incomplete, or mismatched candidates become a typed miss;
  only that target is rebuilt.
- A native-smoke target always runs worker-transfer parity, worker smoke, and
  durable process smoke in the current run, including when its bytes are reused.
- Every target uploads its archive and one current-run evidence record. A
  reused record preserves donor run ID, donor source SHA, archive digest, and
  byte count.

Artifact retention limits reuse duration. Expiry is an ordinary miss and does
not weaken the immutable set or result requirements.

The staging step also short-circuits when `sets/<aggregate>/manifest.json`
already exists on the prebuild branch and matches the expected build and
source fingerprints. This combines with the artifact cache to let a re-dispatch
publish in a few seconds when nothing has changed.

## New dispatch

Only dispatch after the user has explicitly authorized the remote side effect.
The authorization must cover a write to the shared prebuild branch.

Use a unique request ID that is safe in workflow input and stable for the
entire attempt. Pass the exact repository, `main` or approved development ref,
and the complete source SHA. The workflow run title and its result document
must contain the same request ID.

The command must not choose the latest successful workflow run. A new dispatch
is identified by all of: workflow filename, repository, exact source SHA,
request ID, and the run ID returned after dispatch.

## Resume

Resume only when the user or the recorded receipt provides a specific run ID.
Before reading artifacts, verify that run's workflow, event type, repository,
head SHA, request ID, and conclusion. A failed run is evidence of failure; do
not substitute a newer successful run.

If the result artifact is available, preserve its path and checksum in the
operation report. If it is unavailable, report the recovery blocker with the
run ID; do not infer result values from branch contents.

## Result proof

Read `synthesis-sidecar-runtime-prebuild-result.v3` and reject it unless all
of these are exact matches:

- repository;
- workflow `prebuild-synthesis-sidecar-runtime.yml`;
- run ID;
- request ID;
- full source SHA;
- source, build, verification, and pipeline identities;
- trusted verification run, source SHA, and event;
- prebuild branch;
- aggregate SHA-256;
- prebuild commit;
- `sets/<aggregate>` path;
- `targets` contains exactly the seven target keys;
- each target evidence digest and byte count match its immutable-set archive;
- built evidence names the current run/source, reused evidence names its donor,
  and every native-smoke record names the current run.

The result document is the authorization boundary for synchronization. A
matching branch directory alone is insufficient evidence.

## Archive checks

Fetch the prebuild branch at the result's exact commit. Read only
`sets/<aggregate>/manifest.json` and its declared archives. Reject the set if
the aggregate, fingerprint, source fingerprint, archive count, names, target
mapping, size, or SHA-256 does not match.

Require exactly seven archives. Each archive must extract to exactly one target
directory and validate its v3 native bundle manifest and file inventory. A
single target archive may not exceed 15 MiB; the aggregate may not exceed 75
MiB.

## Local synchronization

Run the synchronization command with the aggregate, store root, result file,
repository, source SHA, request ID, and run ID. It validates every archive
before replacing the seven `addon/bin/<target>/synthesis-sidecar/` roots.

Do not manually copy individual platform directories. Do not partially replace
the addon root. The command stages all targets, verifies all bundles, renames
atomically, and restores the previous root when replacement fails.

After synchronization, run:

```bash
npm run check:synthesis-sidecar-runtime-freshness
```

The command must pass before prebuild work is complete.

## Evidence record

Keep one compact operation record while working. It must contain:

- the full local and remote source SHA;
- repository and ref;
- build fingerprint and Rust source fingerprint;
- request ID, workflow run ID, and run URL;
- result-artifact path and schema;
- aggregate, prebuild commit, and immutable set path;
- archive size and digest for every target;
- per-target built/reused mode, donor identity when present, retained archive
  SHA-256/bytes, and current-run smoke status;
- synchronization target root and freshness result.

Use values read from the result and manifest. Do not reconstruct an aggregate
from memory or a terminal transcript. A value that cannot be read from the
result, set manifest, or verified command output is unknown and must be
reported as such.

## Decision table

| Condition | Required action |
| --- | --- |
| User asks for a local build | Build locally; do not call it a prebuild set. |
| Exact result artifact is available | Validate it, then synchronize its set. |
| Exact run is still running | Watch that run; do not dispatch another. |
| Exact run failed | Report the failed run and stop. |
| Result identity differs | Stop; the requested set is not proven. |
| Archive verification differs | Preserve current addon bytes and stop. |
| Freshness fails after sync | Report the root and diagnostics; do not release. |
| Validated candidate for a platform | Reuse exact bytes and run current native smoke when applicable. |
| Cache miss for a platform | Rebuild from the current sources and smokes. |
| Candidate manifest or fingerprint mismatch | Treat that platform as a miss and rebuild. |
| Candidate artifact expired | Treat that platform as a miss and rebuild. |

## Command discipline

Pass options in their explicit form even when a command provides defaults. Use
the complete SHA, never an abbreviated SHA. Keep the downloaded result file in
a stable temporary location until reporting is complete. Use a separate,
throwaway store checkout for prebuild verification and never alter its branch
history.

If a command would write a remote branch, state that side effect before running
it and confirm the current request carries the required authorization. A watch,
download, validation, or local synchronization operation does not imply
authorization for a new dispatch.

## Explicit exclusions

- Do not prepare `synthesis-sidecar/release-set.json`.
- Do not invoke `release:synthesis-sidecar:dispatch`.
- Do not create a GitHub Release or use a release tag as the prebuild store.
- Do not run plugin release or Gitee synchronization.
- Do not make local one-platform output stand in for the seven-platform set.
- Do not bypass an identity mismatch with a flag or environment variable.

## Failure handling

Preserve the request ID, run ID, source SHA, aggregate if known, result file,
and any transaction backup path. State whether the failure occurred before
dispatch, during workflow execution, result validation, archive validation, or
local synchronization.

When the same run is recoverable, give the exact resume command with its
original inputs. When any source, result, aggregate, archive, or digest differs,
report that it is a different prebuild and stop.

## Completion report

Report repository, ref, full source SHA, all four identities, verification run,
request ID, prebuild run ID, result schema, aggregate, prebuild commit, set
path, all seven target evidence records, and the freshness-gate result. Mention
that this is build-only evidence and
hand release preparation to `$synthesis-sidecar-release-pipeline` when needed.
