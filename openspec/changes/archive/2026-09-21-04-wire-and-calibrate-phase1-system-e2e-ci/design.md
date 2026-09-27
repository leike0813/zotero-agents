# Design

## Context

Implementation prerequisite: read [`artifacts/e2e-wayfinder/system-e2e-implementation-handoff.md`](../../../artifacts/e2e-wayfinder/system-e2e-implementation-handoff.md) before applying this change. It is the self-contained source for the Wayfinder decisions and replaces issue-tracker lookup.

The compatibility planner already owns exact Zotero downloads, isolated host sessions, receipts, and the supported platform matrix, but its domain model excludes `e2e`. Its behavioral worker still derives deleted aggregate `suite.test.ts` files from directory entries. E2E staging also builds the current-source sidecar in the ordinary local path, while compatibility requires immutable plugin and sidecar identities without rebuilding inside a cell.

## Goals / Non-Goals

**Goals:**

- Express every agreed lane as an existing compatibility plan cell and worker invocation.
- Measure complete cells through three independent clean manifests before explicit promotion.
- Preserve one artifact identity, one copied profile per invocation, and one evidence chain per attempt.

**Non-Goals:**

- Add a second matrix runner, runtime scenario registry, automatic promotion, or path-based PR skipping.
- Make macOS System E2E blocking or make stress/private-gold lanes release authorities.
- Publish a release or rebuild a candidate inside a compatibility cell.

## Decisions

### 1. Extend the compatibility cell instead of adding workflow-local semantics

An E2E cell identifies lane, exact target/platform, family grouping, runner environment, fixture scale, invocation/profile model, gate state, plugin digest, sidecar fingerprint, and calibration identity. Workflow YAML selects planner output; it does not reconstruct those rules.

Alternative: hard-code each matrix in GitHub Actions. Rejected because planner tests and receipts would no longer be the single compatibility model.

### 2. Consume authoritative test directories directly

The worker passes selected directory entries to the scaffold runner and removes the proxy imports of per-domain `suite.test.ts` files. `e2e` resolves to `tests/zotero/e2e/full`; family filtering is carried by the runner's catalog selection rather than a file/title allowlist.

Alternative: restore aggregate suites. Rejected because aggregate imports duplicate membership and conflict with the taxonomy contract.

### 3. Separate artifact preparation from cell execution

The workflow builds the plugin once and stages a current-source sidecar for each required target identity before host execution. Each cell verifies and consumes those immutable bytes with test prebuild disabled; the ordinary local `npm run test:zotero:e2e` path keeps its existing sidecar staging behavior.

Alternative: let every worker invoke `stageDirectSynthesisBundle()`. Rejected because it silently changes the candidate and violates build-once compatibility evidence.

### 4. Represent calibration and promotion explicitly

Every prospective blocking E2E cell starts `blocking: false`. A calibration record accepts only three complete, clean Run Manifests from independent workflow executions with matching target and environment identity. Promotion is a reviewed configuration edit for that cell; it is never inferred from elapsed time or green status. The maximum clean duration is compared with the lane's grouping threshold: PR 15, main 30, release 45, weekly 60, and private gold 90 minutes.

If a grouping exceeds its threshold, split first into Synthesis versus Host Bridge, then into `SL/PM`, `RH/PA/CG`, and `HB`. A family is never split and profiles are never shared between cells.

### 5. Keep rerun ownership outside Zotero

Only weekly orchestration may rerun, once, the entire failed cell. The second attempt gets a fresh profile and run ID linked to the immutable first attempt. A pass is classified `intermittent`, a second failure `persistent`, and either outcome leaves the workflow failed because the first attempt failed. PR, main, and release never auto-retry.

### 6. Make release evidence tag-bound and pre-publication

Release cells verify the final tag-bound plugin and sidecar identities and finish before publication. Main evidence cannot substitute. Windows cells additionally require passing, trustworthy `CG-02` evidence; Zotero 9 classification remains explicit.

## Risks / Trade-offs

- **The worker repair changes existing behavioral coverage** → extend its current contract tests to prove complete directory membership and failure propagation before adding `e2e`.
- **Cells accidentally rebuild the sidecar** → verify candidate fingerprints before and after each worker and fail on drift.
- **Sparse runners delay three-round calibration** → leave cells non-blocking; absence of evidence cannot be promoted.
- **A scheduled rerun hides the first failure** → persist attempts separately and derive the workflow verdict from the first attempt.

## Migration Plan

1. Confirm Change 3 is implemented, verified, synchronized, and archived.
2. Repair directory-based worker membership and add `e2e` plan/receipt fields under contract tests.
3. Land every new E2E cell non-blocking and wire weekly, stress, and manual-gold triggers.
4. Run three independent clean rounds per candidate cell; regroup and restart calibration only where the observed maximum exceeds its threshold.
5. Promote cells individually through explicit configuration changes after manifest review; do not promote Windows release cells until `CG-02` passes.
6. Verify tag-bound release cells before publication. Rollback demotes affected cells without removing collected evidence or the local E2E command.
