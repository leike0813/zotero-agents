---
name: synthesis-sidecar-release-pipeline
description: Prepare, dispatch, resume, and verify a governed Synthesis sidecar runtime release set. Use when approved native bundles must become locked plugin release input.
---

# Synthesis Sidecar Release Pipeline

## Goal

Promote one exact seven-platform build set into committed plugin runtime input.
Formal promotion joins independently produced build and verification evidence,
materializes all seven bundles atomically, records a complete receipt, and
finalizes source `main`.

This is the only sidecar path that may claim release eligibility.

## Non-goal

This Skill does not:

- produce a new prebuild as an implicit prerequisite;
- weaken the Linux/Windows/macOS verification roster;
- select or bump a plugin version;
- publish a plugin tag or GitHub Release;
- modify Host Bridge release state;
- synchronize Gitee;
- commit, push, or dispatch without the corresponding user authorization.

Use `$synthesis-sidecar-prebuild` to create or resume development build
evidence.

## Input contract

Release preparation requires:

- clean synchronized `main`;
- exact full source commit at HEAD;
- one strict `synthesis-sidecar-runtime-prebuild-result.v4` for that source;
- its exact immutable set at the recorded prebuild commit;
- current source, build, verification, prebuild-pipeline,
  verification-pipeline, and release-pipeline identities;
- one trusted `synthesis-sidecar-verification-result.v2` resolved from GitHub
  run metadata;
- authorization to write the local release-set file.

Dispatch additionally requires explicit authorization for the remote workflow
and its source-main finalization effect.

## Output contract

Preparation writes one strict
`synthesis-sidecar-runtime-release-set.v2` at
`synthesis-sidecar/release-set.json`. It binds:

- release-set ID and exact source commit;
- complete prebuild result v4;
- complete verification result v2;
- release pipeline revision;
- fixed addon root, namespaced bundle directory, and seven targets.

`sourceCommit` is the sidecar source that produced the prebuild. The later
`main` commit containing `release-set.json` is the prepared commit used to
dispatch the workflow; it is kept separate because a document cannot contain
the hash of the commit that contains that same document.

The release-set ID covers source commit, aggregate, exact prebuild commit,
verification identity and run, verification producer revision, and release
pipeline revision.

Successful workflow completion writes
`synthesis-sidecar/latest-complete-release-receipt.json` and finalizes the same
release set plus all seven materialized bundles on `main`.

## Formal verification contract

Verification v2 is produced only after:

- Rust format and Clippy pass on Linux;
- the complete Rust workspace passes on Linux, Windows, and macOS;
- all shared contract and durable-foundation gates pass;
- all four typed application parity gates pass;
- the Rust and bundled SQLite license inventory passes.

The receipt binds repository, workflow, run ID, accepted event, source SHA,
source/build/verification fingerprints, verification pipeline revision, and
three passed hosts. Release preparation validates the artifact against GitHub
run metadata. Release materialization validates it again.

A receipt from another source SHA may be reused only when all governed source,
build, verification, and verification-pipeline identities match.

## Forbidden actions

- Do not create a release set from build evidence alone.
- Do not embed verification into prebuild result v4.
- Do not accept an unrecognized or partially successful host roster.
- Do not choose a different prebuild, verification run, or branch head during
  recovery.
- Do not require the recorded prebuild commit to remain branch HEAD.
- Do not materialize bytes before both evidence documents and the immutable
  set validate.
- Do not manually copy platform bundles.
- Do not edit a committed release set to fit another result.
- Do not infer dispatch authorization from prebuild authorization.
- Do not publish a plugin or synchronize Gitee as part of this workflow.

## Execution flow

### 1. Inspect the formal boundary

Run read-only checks:

```bash
git branch --show-current
git status --porcelain=v1
git rev-parse HEAD
git fetch origin main
git rev-parse origin/main
npm run prepare:synthesis-sidecar-release -- --help
npm run release:synthesis-sidecar:plan -- --help
```

Require branch `main`, an empty status, and local HEAD equal to `origin/main`.
Read the prebuild result through the shared contract. Do not inspect only its
filename or selected JSON fields.

### 2. Prepare the evidence join

With local-write authorization, run:

```bash
npm run prepare:synthesis-sidecar-release -- \
  --prebuild-result=<prebuild-result.json>
```

The command:

1. derives the exact source commit from clean `main`;
2. computes all current governed identities;
3. strictly validates prebuild result v4;
4. resolves a trusted verification v2 with structured diagnostics;
5. validates their source/build relationship and producer revisions;
6. creates release-set v2 only when the join is exact.

Review the resulting release set. Committing and pushing it are separate
actions; perform them only when explicitly authorized.

### 3. Run local gates

Before dispatch, require:

```bash
npm run release:synthesis-sidecar:plan
npm run check:synthesis-sidecar-runtime-freshness
```

Run the focused packaging, contract, parity, license, Rust, lint, formatting,
and OpenSpec gates appropriate to the source change. If the currently
materialized bundles belong to an older build, freshness may remain open until
formal materialization; record that fact instead of changing evidence.

### 4. Dispatch formal materialization

Only after explicit publication authorization, run:

```bash
npm run release:synthesis-sidecar:dispatch -- \
  --release-set-id=<ssrs-id> \
  --repo=<owner/repository>
```

The dispatch command requires clean synchronized `main`, the committed release
set at HEAD, the embedded source commit as its ancestor, and exact request/run
identity. It sends both the source SHA and prepared HEAD SHA. It cannot select
a latest run or dispatch from a development branch.

### 5. Workflow materialization

The workflow must:

1. bind the exact committed release-set ID and source commit;
2. recompute all current identities and re-create the evidence join;
3. revalidate verification receipt v2 against its exact GitHub run metadata;
4. fetch the prebuild result's exact commit directly;
5. prove `sets/<aggregate>/manifest.json` exists at that commit;
6. validate all archives and atomically replace only the seven
   `addon/bin/<target>/synthesis-sidecar/` roots;
7. preserve sibling Host Bridge binaries;
8. run freshness;
9. advance the receipt in order;
10. revalidate identities against the latest `origin/main` before finalizing;
11. commit the seven bundles, release set, and complete receipt together.

Branch-head advancement is normal. It does not invalidate the recorded exact
commit.

## Receipt state machine

Receipt steps progress in this order:

1. `plan`
2. `prebuild`
3. `materialize`
4. `receipt`
5. `finalize`

A completed step does not regress. A failure records the first failed step and
message. A complete receipt requires every step complete for one release-set
ID, source commit, and aggregate.

The receipt's producer identity is `releasePipelineRevision`. Do not use a
generic pipeline revision to stand in for prebuild, verification, and release
producers.

## Resume and recovery

Resume only the same release-set ID, source SHA, aggregate, prebuild commit,
verification run, request ID, and workflow run. Read the receipt before doing
anything else.

| Failure | Recovery |
| --- | --- |
| No matching verification | Run or repair verification separately; do not rebuild solely for this reason |
| Verification metadata mismatch | Reject the receipt and inspect its exact run |
| Exact prebuild commit unavailable | Stop; branch head is not a substitute |
| Archive or bundle mismatch | Preserve current addon bytes and stop |
| Materialization failed before finalization | Resume the same workflow identity after the cause is repaired |
| `origin/main` identities advanced | Prepare a new release set for the new identity |
| Complete receipt already exists | Verify it; do not replay publication |

Never create a new release set merely to conceal a failed run. A changed
aggregate or governed identity is a new release attempt and needs fresh
authorization.

## LLM vs script responsibilities

Scripts own deterministic mechanics:

- strict v4/v2/v2 parsing;
- identity computation and evidence joining;
- verification discovery diagnostics and GitHub metadata binding;
- release-set ID derivation;
- exact-commit fetch and immutable archive validation;
- transactional synchronization and rollback;
- receipt transitions and release plan output.

The Agent owns judgment and communication:

- distinguish preparation, commit/push, dispatch, and plugin publication
  authorizations;
- select the exact user-approved evidence identity;
- explain blockers without weakening gates;
- preserve unrelated user changes;
- report formal completion and remaining plugin-release work separately.

## Completion conditions

Formal sidecar materialization is complete only when:

- the committed release set is v2 and revalidates against current identities;
- its exact verification run remains trusted;
- all seven bundles at the exact aggregate pass freshness;
- the receipt is complete for the same release-set ID/source/aggregate;
- source-main finalization succeeded.

Plugin publication remains a separate authorized workflow. Explicitly state
that Gitee synchronization was not run.

## References

- Evidence join: `scripts/prepare-synthesis-sidecar-release.ts`
- Release-set contract: `scripts/synthesis-sidecar-runtime-release-set.ts`
- Verification resolver: `scripts/resolve-synthesis-sidecar-verification.ts`
- Materializer: `.github/workflows/release-synthesis-sidecar.yml`
- Build producer: `$synthesis-sidecar-prebuild`
