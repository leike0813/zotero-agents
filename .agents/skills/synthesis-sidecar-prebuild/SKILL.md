---
name: synthesis-sidecar-prebuild
description: Dispatch or resume an exact seven-platform Synthesis sidecar build and synchronize its content-addressed binaries. Use for routine development prebuilds from a pushed source SHA.
---

# Synthesis Sidecar Prebuild

## Goal

Complete the routine development prebuild path with one command: identify an
exact pushed source, dispatch or resume its seven-platform build, validate the
immutable result, synchronize all seven local bundles, and prove freshness.

This Skill produces build evidence. It also reports whether matching formal
verification exists, but verification status does not decide whether the
development prebuild succeeded.

## Non-goal

This Skill does not:

- prepare `synthesis-sidecar/release-set.json`;
- weaken or bypass formal release verification;
- commit, push, tag, publish a plugin, or finalize `main`;
- dispatch `verify-synthesis-sidecar.yml`;
- synchronize Gitee;
- treat a one-platform local build as seven-platform evidence.

Use `$synthesis-sidecar-release-pipeline` when the user wants formal
materialization or plugin release input.

## Input contract

The normal command derives its inputs from the current checkout. The checkout
must have:

- an attached branch;
- a full current HEAD SHA;
- a remote branch at the same SHA;
- GitHub CLI authentication capable of reading Actions and, for a new run,
  dispatching the prebuild workflow.

Optional command inputs are:

- `--repo=<owner/repository>` to override the repository;
- `--ref=<branch>` to override the pushed ref;
- `--source-sha=<40-character-sha>` to state the expected HEAD explicitly;
- `--resume-run-id=<positive-id>` to continue an existing exact run;
- `--overwrite-dirty-bundles` only when the user explicitly authorizes
  replacing locally modified sidecar bundle files.

Unrelated dirty paths are valid input. Report them; do not ask the user to
clean or stash them.

## Output contract

Successful stdout is one
`synthesis-sidecar-development-prebuild-operation.v1` JSON document. It binds:

- repository, ref, source SHA, request ID, run ID, and run URL;
- aggregate and exact prebuild commit;
- the dirty paths observed before dispatch;
- atomic synchronization result;
- freshness result;
- independent release-verification status.

`releaseVerification.status` has separate meaning:

- `eligible`: matching trusted verification v2 exists;
- `blocked`: no matching trusted receipt exists;
- `unavailable`: verification discovery could not be completed.

All three statuses are compatible with a completed development prebuild when
build, synchronization, and freshness succeeded.

The workflow artifact is a strict
`synthesis-sidecar-runtime-prebuild-result.v4`. It contains build-only facts:

- source and build fingerprints;
- prebuild pipeline revision;
- aggregate, immutable set path, and exact containing commit;
- exactly seven target evidence records.

It contains no verification receipt or release-eligibility claim.

## Target set

The immutable set contains each target exactly once:

- `win32-x64`
- `darwin-x64`
- `darwin-arm64`
- `linux-x86`
- `linux-x64`
- `linux-arm`
- `linux-arm64`

Sets live on `synthesis-sidecar-runtime-prebuilds` at
`sets/<aggregate>/`. The branch is append-only. A result binds the exact commit
that contains its set; that commit does not need to remain branch HEAD.

## Forbidden actions

- Do not manually run the workflow when the supported command can perform the
  same operation.
- Do not dispatch a new run without explicit authorization for the remote
  workflow side effect.
- Do not dispatch a replacement when `--resume-run-id` identifies a
  recoverable run.
- Do not require a clean worktree.
- Do not overwrite a dirty
  `addon/bin/<target>/synthesis-sidecar/` root without the explicit overwrite
  option and current user authorization.
- Do not choose a “latest successful” result in place of the exact request.
- Do not fetch only the prebuild branch head when the result records another
  commit.
- Do not copy individual platform directories by hand.
- Do not force-push or rewrite the prebuild branch.
- Do not infer evidence from terminal output when the typed result or manifest
  is absent.

## Execution flow

### 1. Inspect without mutation

Run:

```bash
git branch --show-current
git rev-parse HEAD
git status --porcelain=v1
npm run prebuild:synthesis-sidecar:dispatch -- --help
```

Record unrelated dirty paths. If any dirty path is inside a sidecar bundle
root, tell the user that synchronization will stop unless they explicitly
authorize `--overwrite-dirty-bundles`.

### 2. Choose dispatch or resume

For a new authorized build, use:

```bash
npm run prebuild:synthesis-sidecar:dispatch -- \
  --repo=<owner/repository> \
  --ref=<pushed-branch> \
  --source-sha=<full-sha>
```

For an existing run, use the same identity and add:

```bash
--resume-run-id=<run-id>
```

The command validates the run's workflow, event, repository, ref, source SHA,
request ID, and result identity. Resume never redispatches.

### 3. Let the command finish the common path

The command performs these operations as one bounded workflow:

1. fetch the requested remote ref and require equality with HEAD;
2. dispatch or bind the exact workflow run;
3. watch that run and retain its recovery identity on failure;
4. download and strictly rebuild result v4;
5. recheck dirty bundle roots immediately before replacement;
6. fetch the result's exact prebuild commit;
7. validate all archive digests, layouts, manifests, targets, and sizes;
8. atomically replace the seven namespaced bundle roots while preserving
   sibling Host Bridge binaries;
9. run sidecar runtime freshness;
10. report formal verification status independently.

Do not repeat these steps manually after the command succeeds.

### 4. Interpret failures

Classify the first failed boundary:

| Boundary | Meaning | Recovery |
| --- | --- | --- |
| Remote ref mismatch | Requested bytes are not pushed | Push only if separately authorized, then rerun |
| Workflow failed | Native construction or publication failed | Inspect the exact run; resume that run after repair |
| Result mismatch | Artifact is not the requested operation | Stop; do not substitute another run |
| Immutable-set mismatch | Branch bytes do not prove the result | Stop and preserve local addon bytes |
| Dirty bundle overlap | Synchronization would overwrite user work | Ask for explicit overwrite authorization |
| Atomic sync failure | Replacement did not complete | Report diagnostics; the previous root is restored |
| Freshness failure | Local bundles do not match current build identity | Report diagnostics; do not call the operation complete |
| Verification blocked | Formal release evidence is absent | Development prebuild is complete; formal release remains blocked |

When watch fails, preserve the run ID printed by the command and give the exact
resume command. Never hide a failed run by dispatching another.

## Artifact and cache rules

Prior per-target workflow artifacts are cache candidates only. Reuse requires
the exact source fingerprint, build fingerprint, target, closed bundle
manifest, archive layout, file inventory, size, and digest. A missing, expired,
or mismatched candidate becomes a miss for that target.

Native-smoke targets execute current-run worker and durable process smoke even
when archive bytes are reused. Result evidence records donor run/source for
reused bytes and current run/source for built bytes.

The publisher validates the complete candidate before appending it. It retries
bounded non-fast-forward races from the latest branch state, never force
pushes, and accepts an existing set only when every byte matches.

## LLM vs script responsibilities

The script owns deterministic mechanics:

- source/ref equality;
- workflow dispatch, resolution, resume, watch, and artifact download;
- strict v4 parsing and identity comparison;
- exact-commit fetch;
- archive and bundle validation;
- dirty bundle overlap detection;
- transactional synchronization, rollback, freshness, and JSON output.

The Agent owns judgment and communication:

- confirm remote-dispatch authorization;
- decide whether the request is new dispatch or resume;
- avoid expanding authorization into push, release, or overwrite actions;
- explain the first failed boundary and recovery command;
- summarize build completion separately from formal release eligibility.

Do not duplicate script checks with a long manual gate sequence.

## Completion conditions

The development prebuild is complete only when the operation JSON has:

- `status: "complete"`;
- the requested repository/ref/source/run identity;
- an exact aggregate and prebuild commit;
- successful seven-target synchronization;
- `freshness.ok: true`.

Report release-verification status on a separate sentence. A blocked or
unavailable verification status means “not ready for formal release,” not
“prebuild failed.”

## References

- Development command: `scripts/dispatch-synthesis-sidecar-prebuild.ts`
- Build-only producer: `.github/workflows/prebuild-synthesis-sidecar-runtime.yml`
- Immutable publisher: `scripts/publish-synthesis-sidecar-runtime-prebuild.ts`
- Atomic synchronizer: `scripts/sync-synthesis-sidecar-runtime-prebuilds.ts`
- Formal promotion: `$synthesis-sidecar-release-pipeline`
