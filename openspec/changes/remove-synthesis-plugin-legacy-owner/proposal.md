## Lifecycle dependency

This change follows `simplify-xpi-owned-synthesis-sidecar-lifecycle`. It MUST
preserve the fixed XPI runtime, launch-scoped session identity, Rust OS lock,
and direct production open. It MUST NOT restore cutover receipts, runtime
admission, activation, critical smoke, owner/lease files, persisted
generations, or plugin backup/restore ownership.

## Why

R9a made the Rust sidecar the only production owner, but the plugin source tree
still contains a complete in-process service, repository, composition root, and
test-only construction path. Keeping that second owner implementation makes
ownership audits harder and leaves a large body of unreachable code that can
silently regain callers.

## What Changes

- **BREAKING (internal only)**: Remove the plugin-side legacy Synthesis
  composition, service, repository owner, domain orchestration, and production
  factories that were replaced by the native client.
- Extract the grouped-client-from-port adapter currently housed in
  `inProcessClient.ts` into a neutral native-compatible module before deleting
  the in-process implementation.
- Move the readonly UI harness to a bounded readonly/native snapshot adapter so
  it cannot construct the legacy owner or write production roots.
- Delete or reduce plugin modules, adapters, tests, and exports whose only caller
  was the legacy composition; retain Zotero UI, public client contracts,
  reverse-Host adapters, delivery adapters, and pure plugin-owned projections.
- Replace the transitional “one allowed direct legacy consumer” boundary with a
  zero-construction, zero-production-root-opener invariant.
- Preserve fail-closed startup, recovery, shutdown, and stable public client
  behavior when the native owner is unavailable.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-client-foundation`: Retire the in-process production composition
  while preserving the grouped public client and a neutral client-port adapter.
- `synthesis-default-client-lifecycle`: Remove legacy service lifecycle
  responsibilities and make all generation cleanup native-owner scoped.
- `synthesis-native-production-routing`: Strengthen “no fallback” into physical
  absence of a plugin legacy route or factory.
- `synthesis-sidecar-service-boundary`: Restrict the plugin permanently to
  client, lifecycle, UI, proxy, and bounded Host-adapter responsibilities after
  cutover.
- `ui-readonly-harness`: Preserve readonly Workbench coverage without opening or
  composing the deleted plugin Synthesis owner.

## Impact

- Affects `src/modules/synthesisClient`, the legacy portions of
  `src/modules/synthesis`, readonly harness adapters, client lifecycle tests,
  boundary checks, and current-state architecture documentation.
- Public `SynthesisClient`, Workflow, Workbench, Host Bridge, MCP, reverse-Host,
  cutover receipt, database, and canonical formats remain unchanged.
- Depends on `stabilize-synthesis-r9a-retirement-baseline`.
- Leaves `apps/synthesis-service` and its executable Node oracle temporarily
  intact for the final retirement change; it remains unreachable from product
  runtime and no release is allowed between the dependent R9b changes.
