# Proposal

## Why

Phase 1 proves the runner, manifest, and fixture contracts on Synthesis and Host Bridge seams. The ACP transport/drain, SkillRunner submission/reconciliation/apply, conversation ownership, transcript boundary, real-host publication, and Windows materialization risks still have no public-entrypoint evidence: every historical regression in this band is currently proven only by Node-and-mock or harness-level tests. The catalog must be implemented before those risks can be measured.

## What Changes

- Implement the fourteen Phase 2 Scenario Cases: `AC-01`..`AC-05`, `AO-01`, `AT-01`, `SR-01`..`SR-04`, `AW-01`, `AW-02`, `AP-01`.
- Extend the existing deterministic ACP child fixture `tests/fixtures/acp/acp-composer-reply-agent.mjs` with the normal, startup-stall, controlled-exit, and cancel/result-race modes. Do not add a second ACP peer.
- Extend the existing Mock SkillRunner peer with handshake throttling and runner-controlled restart on a fixed port. Do not create another SkillRunner peer.
- Give the E2E runner one process-restart capability so `AC-05` and `SR-02` can terminate and relaunch Zotero against the same copied profile. Prefer runner-owned process kill; add one local, one-shot, operation-scoped checkpoint around durable `apply.started` only if `SR-02` cannot be hit deterministically from public evidence.
- Run all fourteen cases serially on Zotero 10/Linux in one copied profile through the existing `npm run test:zotero:e2e` path, preserving only declared intra-family carry-over and reusing the shared manifest, fixture, health, cleanup, broker, and workflow-apply contracts.
- Run `AP-01` additionally on Zotero 10/Windows as a non-gating manual lane. Add no new blocking CI placement.
- Keep malformed-protocol matrices, state tables, digest/retention matrices, transcript cache internals, quoting matrices, and static governance at Contract Integration level.
- Start only after `04-wire-and-calibrate-phase1-system-e2e-ci` is implemented, verified, synchronized, and archived.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The Phase 2 catalog, fault-control, and regression-admission requirements are already defined by the `system-e2e-strategy` specification owned by `01-establish-system-e2e-runner-foundation`. This change implements defined behavior and therefore opts out of delta specs via `skip_specs: true` in `.openspec.yaml`.

## Impact

- Adds System E2E case files under the existing `tests/zotero/e2e/full` path.
- Extends `tests/fixtures/acp/acp-composer-reply-agent.mjs` and `tests/mock-skillrunner/`; no new peer process is introduced.
- Adds one runner-owned process-restart capability to `scripts/run-zotero-test-with-mock.ts`.
- May add one test-only one-shot checkpoint inside the SkillRunner apply owner; no global production fault interface is exposed.
- Updates `docs/dev/zotero-e2e.md` and the Phase 2 operator notes.
- Consumes the existing runner, manifest, health, cleanup, broker, and workflow-apply contracts; changes no product runtime behavior.
