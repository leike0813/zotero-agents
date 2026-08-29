## Context

The two R9b deletion changes own source retirement and local native-only gates.
They do not authorize remote seven-target dispatch or provide all environments
needed for XPI, data, failure-injection, and Zotero 7/9 acceptance. The accepted
pre-deletion candidate remains the safety baseline; this change evaluates the
post-deletion candidate and makes no product code changes.

## Goals / Non-Goals

**Goals:**

- Produce one machine-readable, reviewable receipt set tied to an immutable
  post-retirement source identity.
- Reuse governed native build, synchronization, package, installation, process,
  migration, and real-machine harnesses.
- Distinguish passed, failed, pending, not-applicable, and not-authorized facts.
- Make the completion decision reproducible without archived change artifacts.

**Non-Goals:**

- Publish a release, tag, GitHub asset, content feed, or Gitee mirror.
- Reintroduce Node/plugin owners or add an implementation selector for testing.
- Treat local simulation as a substitute for a required target or real-machine
  result.
- Change sidecar behavior while collecting acceptance evidence.

## Decisions

### 1. Use one candidate identity envelope

Every receipt carries the source commit, Rust toolchain, Cargo lock digest,
workflow identity, seven target fingerprints, and universal-XPI digest. A
collector rejects mixed envelopes instead of merging individually green
results. This prevents accidental acceptance of an unbuildable combination.

Alternative: accept the newest result for each platform independently.
Rejected because source or toolchain drift can hide cross-platform defects.

### 2. Separate evidence production from the completion decision

Build, package, install, failure, migration, and real-machine jobs emit typed
receipts. A final read-only evaluator checks required membership, identity,
status, privacy, and budgets. It does not dispatch jobs or publish artifacts.

Alternative: let the workflow declare completion as its final step. Rejected
because some evidence comes from operator-controlled real machines and because
workflow success must not become release authorization.

### 3. Preserve original profile data through isolated samples

Existing and legacy profiles are copied into isolated acceptance roots. Source
databases are opened only through read-only snapshots for before/after hashes;
all mutation happens on the copy. Receipts exclude document content.

Alternative: rehearse against a live profile after backup. Rejected because a
backup is not sufficient authority to mutate user production data.

### 4. Exercise lifecycle through real executable boundaries

Crash, EOF, lock, restart, fuse, shutdown, and orphan cases use packaged native
executables and observe discovery, RPC, process exit, and filesystem cleanup.
Unit or source-shape evidence may diagnose a failure but cannot replace these
acceptance cases.

### 5. Keep authorization boundaries explicit

Remote candidate dispatch, signing required by an acceptance environment, and
real-machine execution begin only under their separate authorization. Release,
feed, and Gitee actions are never part of this change. Pending authorization is
a normal recorded state, not a passing result.

## Risks / Trade-offs

- **Candidate bytes change during a long matrix** → Pin and re-verify the
  identity envelope before every environment run.
- **A platform is temporarily unavailable** → Record it as pending and keep the
  completion decision false; do not infer from another architecture.
- **Existing-data fixtures expose private content** → Use isolated minimal
  copies and emit only approved counts, statuses, schema facts, and hashes.
- **Failure injection leaves processes or roots behind** → Give every harness a
  bounded owner, verify cleanup, and fail the case on residual state.
- **A green matrix is mistaken for publication approval** → The evaluator emits
  only an acceptance decision and contains no publication credentials or step.

## Migration Plan

1. Confirm both retirement changes are locally complete and pin the final
   source/toolchain/lock identity.
2. Under separate authorization, produce and verify all seven native bundles.
3. Assemble the universal XPI and run native-only inventory, integrity, license,
   provenance, SBOM, freshness, and size checks without publishing.
4. Run clean, upgrade, offline, corrupt/wrong-platform, process lifecycle,
   production-lock, migration, backup/failure, and runbook cases.
5. Run the agreed Zotero 7/9 real-machine matrix.
6. Evaluate the complete receipt set. Any missing or mismatched fact leaves the
   change open; a complete passing set permits the R9/Stage-1 completion claim.

Rollback is simply discarding the unpublished candidate and preserving the
previous accepted source. Runtime recovery during tests follows the native
restart, repair, forward-migration, or explicit stopped-service restore paths.
