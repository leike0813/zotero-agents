## 1. Behavioral Baseline

- [x] 1.1 Extract the existing Dashboard Host runtime harness into `tests/helpers` and verify the current mount, snapshot, refresh, action, and cleanup tests pass through the public host interface.
- [x] 1.2 Replace Dashboard-specific source-text assertions with observable host/page behavior or delete them where existing domain tests already cover the behavior; verify the focused core and UI test files pass without private path, function-name, CSS-token, or full-localization-text assertions.

## 2. Dashboard Host Identity

- [x] 2.1 Rename the root owner and public lifecycle symbols, remove the unused legacy hook event, and update all production/test imports; verify TypeScript and focused host tests pass with no forwarding file.
- [x] 2.2 Migrate active DOM, source/diagnostic, and localization identifiers from Task Manager to Task Dashboard while preserving displayed translations; verify localization governance and active-root searches pass.

## 3. Private Implementation Deepening

- [x] 3.1 Extract iframe/message and management-overlay ownership into `dashboard/dashboardFrame.ts`; verify standalone and embedded lifecycle tests pass.
- [x] 3.2 Extract mutable state, refresh/cache publication, subscriptions, and cleanup into `dashboard/dashboardRuntime.ts`; verify refresh scope, coalescing, signature suppression, and idempotent cleanup tests pass.
- [x] 3.3 Extract snapshot assembly and signature projection into `dashboard/dashboardSnapshot.ts`; verify snapshot and Dashboard region behavior tests pass without wire DTO changes.
- [x] 3.4 Extract host wire action dispatch into `dashboard/dashboardActions.ts` with a focused private context and no reverse imports; verify representative action-family behavior tests pass.

## 4. Domain Language And Documentation

- [x] 4.1 Add Dashboard Host to `CONTEXT.md`, rename and update active Dashboard Host documentation/current specs/governance paths, and verify archived OpenSpec files remain unchanged.

## 5. Integration Verification

- [x] 5.1 Verify no active Task Manager identifiers or Dashboard source-text tests remain, then run localization, core/UI, build, and lint checks with all results passing.
