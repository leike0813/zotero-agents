# Tasks

## 1. Mutation enumeration (read-only)

- [x] 1.1 Add `listPluginMutationAuthorityEntries(scope)` to `src/modules/pluginStateStore/mutationAuthorityTable.ts`, expose it through `pluginStateStore.ts`, and add `listMutationOperations` to `src/modules/zoteroHostMutationAuthority.ts`; TDD with enumeration cases in `tests/zotero-host/241-zotero-host-mutation-authority.test.ts` (empty table, cross-scope isolation, all three states).

## 2. Shared health gate module

- [x] 2.1 Create `scripts/system-e2e/healthGate.ts` with `observeSystemE2EHealth` (real `undeclaredOperations` via sidecar `debug.listOperations` plus `started` mutation entries with carry-over exemptions; real `managedProcesses` via alive discovery pids; `indeterminate` instead of fabricated zeros when the sidecar is not ready), `waitUntil`, `assertRemainsStable`, `listSidecarDiscoveries`, and platform-dispatched `processIsAlive`/`terminateProcess`.

## 3. Case-file rebuild

- [x] 3.1 Rebuild `301-system-e2e-foundation` on `observeSystemE2EHealth`; the baseline `deepEqual` expectation is unchanged in shape but now backed by measurement.
- [x] 3.2 Rebuild `302-sidecar-recovery` on the shared module: all fourteen health gates, HB-03 exempts its declared carry-over mutation operation, three negative assertions use `assertRemainsStable`, visibility delays collapse to `HOST_FACTS_SETTLE_MS`, repeated cleanup prefixes move into `cleanupOwnedReferences` with verdict-identical semantics.
- [x] 3.3 Replace the CG-01 tautological fixture assertion with a `getSlice` topology assertion against the rebuilt graph (source node kind, outgoing citation edge, target resolution, `graph_hash` basis).

## 4. Windows unlock

- [x] 4.1 Remove the six Linux-only skips (SL-01/02/03, PM-02/03, HB-03), route sidecar termination through `terminateProcess`, and gate the flock assertion to non-Windows with the Windows evidence path documented in place.

## 5. Verification

- [x] 5.1 `tests/zotero-host/241` suite, `tsc --noEmit`, eslint, prettier.
- [x] 5.2 Full `npm run test:zotero:e2e` on Linux with the real health gate active. (16/16 passed on the pinned Zotero 10.0.2 host; note: the system `/usr/lib/zotero` 9.0.4 on this machine hangs inside SL-02 with or without this change — pre-existing environment issue.)
- [ ] 5.3 One Windows calibration round covering the six unlocked cases (requires a Windows host; evidence to be recorded under the Phase 1 calibration trail).
