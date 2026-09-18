# Proposal

## Why

The runner and fault-control changes make System E2E execution trustworthy but leave most Phase 1 cross-process risks without public-entrypoint evidence. The six-family catalog must be completed before its compatibility cells can be measured or promoted.

## What Changes

- Implement the twelve Phase 1 Scenario Cases not delivered by Change 2 across Sidecar Lifecycle, Reverse Host, Provenance and Artifact Resilience, Public Maintenance, Citation Graph, and Host Bridge canonical mutation replay.
- Extend the Committed Seed only with deterministic, de-identified structural facts required by those cases, while keeping private large-library data optional and read-only.
- Admit `CG-02` for the Windows Zotero 10 Citation Graph close crash: establish an unattended public-UI reproduction and evidence surface, record the observed Zotero 10 and Zotero 9 results, and defer unresolved root-cause work to a dedicated change after the complete E2E framework is available.
- Keep `300-lisongtao-gold` and `276-dashboard-synthesis-close` in place as adjunct evidence; similarity does not make either a catalog case.
- Require every case to report public or typed outcomes, lifecycle evidence, cleanup, Suite Health Gate state, and sanitized artifact references through the shared Run Manifest.
- Start only after `02-add-system-e2e-fault-control-and-sidecar-recovery` is implemented, verified, synchronized, and archived.

## Capabilities

### New Capabilities

None. The catalog requirements and regression-admission policy are defined by `system-e2e-strategy` in Change 1.

### Modified Capabilities

None. This change implements already-defined behavior and therefore opts out of delta specs.

## Impact

- Adds System E2E cases and de-identified fixture facts under the existing `tests/zotero/e2e/full` path.
- Does not change a production owner for `CG-02` without a red reproduction; the dedicated follow-up change must diagnose the owner before applying a fix, and the Windows release-promotion prerequisite remains in force.
- Updates E2E operator/developer documentation and consumes the existing runner, manifest, health, cleanup, sidecar, Host Bridge, and workflow-apply contracts.
