# Proposal

## Why

The Phase 1 System E2E review (1a35f4b2..11a40626) found that the Suite Health Gate fails open on two of its dimensions: `observeHealth()` in both `301-system-e2e-foundation` and `302-sidecar-recovery` hardcodes `undeclaredOperations: 0` and `managedProcesses: 0`, while `runFamilyLifecycle` treats both fields as fail-closed leak detectors. The CG-01 case ends with a tautological assertion that compares the seed fixture against itself and never touches the runtime graph. Three negative assertions (PM-02/03/04 "not replayed") sample once after a 100 ms delay, which cannot prove a durable state machine guarantee on a slow runner. Six cases (SL-01/02/03, PM-02/03, HB-03) are skipped outside Linux only because their process helpers hardcode `/bin/kill` and `/usr/bin/flock`.

## What Changes

- Add a read-only `listMutationOperations` enumeration to the canonical mutation authority (`mutationAuthorityTable.ts` → `pluginStateStore.ts` → `zoteroHostMutationAuthority.ts`) so the health gate can count non-terminal Host Bridge mutations.
- Add `scripts/system-e2e/healthGate.ts` as the shared health/process module: real `undeclaredOperations` (sidecar non-terminal operations plus `started` mutation entries, minus declared carry-over exemptions), real `managedProcesses` (alive discovery pids beyond the single ready generation), platform-dispatched `processIsAlive`/`terminateProcess` (tasklist/taskkill on Windows), `waitUntil`, and `assertRemainsStable` (2 s polling window for negative assertions).
- Rebuild 301/302 on the shared module; replace the CG-01 tautology with a `getSlice` topology assertion against the rebuilt graph; harden the three negative assertions with `assertRemainsStable`; collapse the seven visibility `delay(250)` calls behind a named constant; extract the repeated cleanup prefix into `cleanupOwnedReferences`.
- Unlock the six skipped cases on Windows (and macOS): remove the Linux-only skips, route sidecar termination through `terminateProcess`, and gate the flock assertion to non-Windows (Windows relies on the case's existing discovery-gone plus process-exit evidence).

## Capabilities

None. This change repairs test infrastructure and adds one read-only production query; it implements no new product behavior and therefore opts out of delta specs via `skip_specs: true`.

## Impact

- `src/modules/pluginStateStore/mutationAuthorityTable.ts`, `src/modules/pluginStateStore.ts`, `src/modules/zoteroHostMutationAuthority.ts`: one read-only enumeration each; no write-path or admission semantics change.
- `scripts/system-e2e/healthGate.ts`: new shared module, imported only by in-Zotero e2e cases.
- `tests/zotero/e2e/full/301-system-e2e-foundation.zotero.test.ts`, `302-sidecar-recovery.zotero.test.ts`: rebuilt on the shared module.
- `tests/zotero-host/241-zotero-host-mutation-authority.test.ts`: enumeration coverage.
- Existing promoted-cell calibration evidence was recorded against the hardcoded health fields; cells should be recalibrated on their next scheduled run.
- Windows unlock is verified for code correctness on Linux; the Windows cells themselves need one calibration round on a Windows host.

## Non-goals

- Crash-journal evidence in release-form candidates (elision define split) and the Zotero 9 affected-gate wiring remain open governance items from the review and are not part of this change.
