# Design

## Context

Implementation prerequisite: read [`artifacts/e2e-wayfinder/system-e2e-implementation-handoff.md`](../../../artifacts/e2e-wayfinder/system-e2e-implementation-handoff.md) before applying this change. It is the self-contained source for the Wayfinder decisions and replaces issue-tracker lookup.

Change 1 owns the strategy, shared-profile lifecycle, fixture identity, and Run Manifest. Change 2 supplies `SL-03`, `RH-02`, and `PM-03`. This change fills the remaining Phase 1 cases through the existing E2E runner and production public entrypoints. `HB-03` also pulls forward the runner-owned same-profile Zotero restart that later restart cases reuse. Direct durable-row observation proved too slow for the `notes.create` admission-to-effect window, so HB-03 uses one additional test-runtime-only, one-shot, operation-scoped hold after durable admission; it is not reachable through production configuration or a public surface. Issue #56 adds a distinct close-lifecycle regression because its trigger and stable outcome differ from `CG-01`.

## Goals / Non-Goals

**Goals:**

- Exercise the remaining production compositions with one copied profile, family-owned state, and stable external evidence.
- Reuse public Workbench, plugin lifecycle, formal protocol, and Host Bridge CLI paths instead of private repositories or supervisors.
- Provide an unattended Windows reproduction command and sanitized lifecycle evidence for `CG-02`, preserving the evidence needed for later diagnosis when the crash does not reproduce.

**Non-Goals:**

- Reproduce lower-layer protocol matrices, graph algorithm details, persistence layouts, or private call order in System E2E.
- Move or relabel the existing gold and close-stress tests solely because they are similar.
- Add another fixture source, scenario registry, runner, fault-control service, or CI promotion.

## Decisions

### 1. Organize execution by the existing six family owners

Cases remain serial inside `SL`, `RH`, `PA`, `PM`, `CG`, and `HB`. Each family creates only namespaced state declared to the runner and cleans it before returning the shared profile. Intentional carry-over is restricted to state needed by another case in the same family and is declared before execution.

Alternative: isolate every case in a new profile. Rejected because it evades the agreed shared-profile contamination and reconciliation risks.

### 2. Add only the structural fixture facts each case consumes

The Committed Seed gains synthetic multi-page references, historical Topic/provenance facts, valid and malformed artifact neighbors, graph basis data, and deterministic Unicode note content. Fixture changes follow the strategy's schema/revision rules and expose no titles, authors, source text, local paths, databases, or private content hashes.

Alternative: generate all setup through test code. Rejected because deterministic baseline identity and reset validation would be lost.

### 3. Drive each case through the highest stable public entrypoint

`SL` uses plugin lifecycle and `system.shutdown`; `RH`, `PA`, `PM`, and `CG` use the public Workbench or formal Synthesis surface; `HB` uses the public Host Bridge CLI and `mutation.get_operation`. Assertions consume typed outcomes, durable receipts, process/discovery state, public projections, and Run Manifest references.

`HB-03` requests one runner-owned restart. A test-runtime-only hold pauses the selected operation after durable admission and publishes an operation-scoped checkpoint marker; the runner uses only that marker to time an exact-PID host termination, preserves the profile while the scaffold relaunches, and resumes the same case. Recovery evidence remains the public `mutation.get_operation` result and bounded note projection; the checkpoint is not a passing assertion and no generic operation store or public fault interface participates.

Alternative: call private module seams for determinism. Rejected because that would turn the case into Contract Integration evidence.

### 4. Treat CG-02 as an evidence-led diagnostic entry, not a speculative Synthesis change

Adapt the existing `276-dashboard-synthesis-close` public UI path into an unattended Windows Zotero 10 command that records sanitized terminal evidence plus the last lifecycle stage. If the crash reproduces, preserve the red evidence for owner diagnosis; if it does not, record the tested versions and defer diagnosis, owner-level regression, and production repair to a dedicated change after the complete E2E framework is available. Run Zotero 9 and record affected, unaffected, or unverified; never infer it from Zotero 10. In either case, keep `CG-02` as a Windows release-promotion prerequisite.

Alternative: attribute the crash to Preact, Sigma, sidecar shutdown, or frame teardown before reproduction. Rejected because version `0.8.4` predates the later Preact migration and no owner has been established.

### 5. Keep adjunct tests independent

`300-lisongtao-gold` remains optional gold evidence and `276-dashboard-synthesis-close` remains the stress entry. Shared helpers may be extracted when the new cases need the same public flow, but catalog completion is based on the catalog trigger and assertions, not filenames or code reuse.

## Risks / Trade-offs

- **A family contaminates later cases** → fail closed on undeclared state, cleanup ambiguity, or Suite Health Gate failure.
- **Fixture growth exposes user data** → accept only deterministic synthetic structure and run fixture privacy validation.
- **CG-02 instrumentation changes timing** → keep only the minimum terminal-stage probe, retain sanitized evidence, and do not infer a root cause from a non-reproducing run.
- **Public UI timing makes a case flaky** → wait on public readiness and typed lifecycle evidence; do not replace the path with sleeps or private calls.

## Migration Plan

1. Confirm Change 2 is implemented, verified, synchronized, and archived.
2. Add failing case evidence family by family, then the minimum fixture, runner, or production change needed to pass it. For `HB-03`, preserve the same copied profile across the runner-owned Zotero relaunch.
3. Run the Windows `CG-02` loop on the available Zotero 10 versions, retain sanitized lifecycle evidence, and classify Zotero 9. Without a red result, leave production code unchanged and defer root-cause work to a dedicated change after the complete E2E framework is available.
4. Run all Phase 1 cases in one clean Zotero 10/Linux invocation, preserving only declared intra-family carry-over.
5. Update strategy-linked documentation and retain the complete sanitized Run Manifest. Rollback removes the new cases/fixture revision and `CG-02` command; it does not alter runner foundations or production ownership.
