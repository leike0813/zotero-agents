# Proposal

## Why

Issue #51 proved that the existing `npm run test:zotero:e2e` runner can drive
the real current-source sidecar through process, lock, port, disconnect, and
restart boundaries, and the same spike exposed a live production defect: after
the supervisor leaves `ready`, the previous generation's Reverse Host
`serviceInstanceId` binding is still installed, so the replacement sidecar's
probe is rejected as `reverse_host_stale_instance` and the supervisor reaches
`sidecar_crash_loop_fused` instead of publishing a new ready generation. The
runner from Change 1 can execute cases but cannot yet hold the sidecar at the
two semantic windows the catalog needs, and three Phase 1 cases have no
implementation at all.

## What Changes

- Revoke the Reverse Host `serviceInstanceId` binding as soon as the production
  owner leaves a ready generation, and bind a generation's instance ID only
  after that generation reaches ready. The existing production owner and
  Reverse Host broker keep their ownership; no pass-through fault module is
  added.
- Add exactly two test-only, one-shot, operation-scoped checkpoints:
  Reverse Host after the first reference page is served and before the next
  page is requested, and Public Maintenance after durable admission and before
  worker dispatch. Both are private to their owning modules and invisible in
  production behavior.
- Implement the formal `SL-03`, `RH-02`, and `PM-03` Scenario Cases on the
  runner and evidence contract delivered by Change 1.
- Add focused regression checks at the production module interfaces for
  binding revocation and for each checkpoint's one-shot, operation-scoped
  behavior.
- Add no global production fault service, change no public protocol or wire
  contract, and create no second runner or scenario registry.
- Leave the independent `complete-synthesis-r9-stage1-acceptance` change
  untouched; `SL-03` evidence may be consumed there only when immutable
  candidate identity and environment match, and no R9 packaging, migration,
  lock, matrix, or evaluator gate moves into this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-runtime-supervision`: Post-ready generation loss must
  revoke the departed generation's Reverse Host instance binding, so a
  replacement generation publishes ready discovery instead of being rejected
  as a stale instance and fusing. The capability also gains the bounded,
  test-private fault-control checkpoints that make the lifecycle, paging-basis,
  and maintenance-restart cases observable without any production fault
  surface.

## Impact

- Plugin source: `src/modules/synthesis/production/synthesisProductionOwner.ts`
  (generation-scoped binding and revocation) and the Reverse Host endpoint's
  instance binding surface.
- Sidecar source: one one-shot reference-paging checkpoint in the Reference
  application's page collection path and one one-shot post-admission
  pre-dispatch checkpoint in the public maintenance owner.
- Tests: `tests/zotero/e2e/full` gains the three formal cases; focused
  regression checks live beside the existing supervisor, Reverse Host, and
  maintenance module tests.
- Starts only after `01-establish-system-e2e-runner-foundation` is
  implemented, verified, synchronized, and archived.

