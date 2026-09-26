## Context

Both R9b deletion changes are archived. Their local gates do not supply the
final candidate XPI, isolated data and failure-injection results, or current
blocking Zotero 7/9/10 compatibility results. The pre-deletion candidate
remains a historical safety baseline; this change evaluates a source-fresh
post-deletion candidate. A lifecycle defect exposed by the first acceptance
cell is included for repair and requires a new source-bound candidate.

## Goals / Non-Goals

**Goals:**

- Produce one reviewable acceptance decision from the existing machine-readable
  prebuild v4, verification v2, package, and compatibility evidence plus any
  missing installation, migration, and process receipts.
- Reuse governed native build, synchronization, package, installation, process,
  migration, and real-machine harnesses.
- Distinguish passed, failed, pending, not-applicable, and not-authorized facts.
- Make the completion decision reproducible without archived change artifacts.

**Non-Goals:**

- Publish a release, create a release tag or asset, advance a content feed or
  production pointer, or synchronize a Gitee mirror.
- Reintroduce Node/plugin owners or add an implementation selector for testing.
- Treat local simulation as a substitute for a required target or real-machine
  result.
- Change unrelated product behavior while collecting acceptance evidence.

## Decisions

### 1. Join existing identities for one candidate

Pin one pushed source commit and use its prebuild v4 result, matching trusted
verification v2 result, seven manifest-v3 bundle identities, and the digest of
one built universal XPI. Resolve Rust toolchain and Cargo lock identity from
the governed build inputs and receipts. Installation and real-machine results
must identify the XPI bytes actually installed, the selected bundle identity,
the source identity, and their run/host provenance. Reject mixed or missing
links instead of inventing a second release-set format. A release-set v2 or
complete release receipt is not a prerequisite for this non-publishing gate;
neither is written or advanced by acceptance.

Alternative: accept the newest result for each platform independently.
Rejected because source or toolchain drift can hide cross-platform defects.

### 2. Separate evidence production from the completion decision

Reuse the prebuild, verification, XPI, compatibility-cell, and Run Manifest
evidence already emitted by their owners. Capture only missing cases in
privacy-safe receipts. A final read-only review checks required membership,
identity, status, privacy, and budgets. Add a small evaluator or test-harness
adapter only if existing checks cannot make that decision reproducibly. The
decision does not dispatch jobs or publish artifacts.

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

### 5. Bind real-machine evidence to the packaged candidate

Use the current compatibility matrix and its blocking policy: Zotero 7, 9,
and 10 on Linux x64 and Windows x64 require the promoted Phase 1 System E2E
families (`SL`, `RH`, `PA`, `PM`, `CG`, `HB`) and their Run Manifest, cleanup,
health, and sidecar-runtime evidence. Record macOS Zotero 10 XPI-smoke cells
according to their current nonblocking policy; do not silently promote them.
Existing release E2E preparation stages a current-source sidecar into a
platform candidate, and ordinary System E2E also builds from source. Neither
result proves byte identity with the universal XPI by itself. Before counting
a cell, compare its installed XPI digest and selected bundle identity with
the pinned acceptance candidate. If the existing runner cannot preserve and
report those bytes, extend that runner or leave the cell pending.
The source is pinned on a pushed development commit, so the tag-bound
`release` lane cannot run this unpublished candidate. Use a distinct
`acceptance` lane with the same six blocking matrix targets and full Phase 1
family roster. Its preparation preserves the universal XPI, and its worker
installs that XPI before the catalog. Keep release-lane tag requirements intact.

### 6. Keep authorization boundaries explicit

Remote prebuild dispatch and any signing or real-machine work that needs
separate authority retain that boundary. The prebuild's immutable-set
publication is build evidence, not release publication. No release tag, asset,
feed, mutable production pointer, or Gitee action belongs to this change.
Pending authorization is a recorded state, never a passing result.

## Risks / Trade-offs

- **Candidate bytes change during a long matrix** → Pin and re-verify the XPI
  digest and selected bundle identity before every environment run.
- **A platform is temporarily unavailable** → Record it as pending and keep the
  completion decision false; do not infer from another architecture.
- **Existing-data fixtures expose private content** → Use isolated minimal
  copies and emit only approved counts, statuses, schema facts, and hashes.
- **Failure injection leaves processes or roots behind** → Give every harness a
  bounded owner, verify cleanup, and fail the case on residual state.
- **A green matrix is mistaken for publication approval** → The evaluator emits
  only an acceptance decision and contains no publication credentials or step.

## Migration Plan

1. Confirm both retirement changes are archived and pin the pushed source,
   toolchain, Cargo lock, and current matrix identities.
2. Under the applicable authority, obtain and verify the matching prebuild v4
   and verification v2 results and all seven native bundles.
3. Assemble one unpublished universal XPI and run native-only inventory,
   integrity, Cargo-lock-matched license inventory, provenance, native
   smoke/handshake platform-signature status, freshness, and size checks.
4. Run clean, upgrade, offline, corrupt/wrong-platform, process lifecycle,
   production-lock, migration, backup/failure, and runbook cases.
5. Run the current blocking Zotero 7/9/10 Linux/Windows cells on the same XPI;
   record the nonblocking matrix cells separately.
6. Evaluate the complete receipt set. Any missing or mismatched fact leaves the
   change open; a complete passing set permits the R9/Stage-1 completion claim.

Rollback is simply discarding the unpublished candidate and preserving the
previous accepted source. Runtime recovery during tests follows the native
restart, repair, forward-migration, or explicit stopped-service restore paths.

The first Zotero 7 Linux HB-03 cell exposed stale ready discovery from a
previous session after its host owner was force-terminated. The production-lock
winner must remove old session discovery before publishing readiness. That
product correction invalidates the earlier seven-bundle/XPI identity; all
acceptance results must be joined to a rebuilt source-bound candidate.
