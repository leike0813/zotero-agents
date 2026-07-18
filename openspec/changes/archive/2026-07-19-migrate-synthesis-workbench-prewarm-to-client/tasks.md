## 1. Red Tests

- [x] 1.1 Update Workbench tests to require client-routed phased prewarm, exact default order, explicit chrome-only empty arrays, once-converted state, event-loop yields, and single-flight behavior.
- [x] 1.2 Extend Workbench tests for chrome termination, per-surface error isolation, cache/runtime merge order, dynamic runtime lookup, loaded-state tracking, and active-surface publication guards.
- [x] 1.3 Update service-boundary tests to require removal of the legacy warmup method and inventory group while preserving exactly four direct legacy consumers and the unchanged client contract.

## 2. Client-Orchestrated Prewarm

- [x] 2.1 Move phased chrome and surface prewarm into the Workbench host using existing `readChrome` and `readSurface` client capabilities and one captured, converted state.
- [x] 2.2 Preserve single-flight cleanup, event-loop yielding, failure boundaries, global cache merges, dynamic runtime merges, loaded-state tracking, guarded publication, and final aggregate convergence.

## 3. Legacy Surface Removal

- [x] 3.1 Remove `warmSynthesisWorkbenchSurfaces`, its public return entry, and imports used only by that method from the legacy Synthesis service.
- [x] 3.2 Remove the `workbench_warmup` migration inventory group and update service method-count assertions without changing the direct-consumer allowlist.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, and Workbench host documentation for client-orchestrated prewarm and the remaining legacy scope.
- [x] 4.2 Run contract/root typechecks, focused Workbench and boundary/client lifecycle/workflow tests, read-only UI harness, service-boundary and Synthesis invariant checks, targeted formatting/lint, and production build.
- [x] 4.3 Run strict OpenSpec validation and confirm all implementation tasks are complete.
