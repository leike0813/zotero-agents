## Context

See `proposal.md`. The current root module exposes a small host interface but captures Dashboard state, caches, timers, subscriptions, frame ownership, snapshot assembly, and more than sixty wire actions in one function. ADR 0001 permits the stable cross-domain seam at `src/modules` root and forbids barrel or compatibility forwarding paths. The page source and JSON wire contract have separate owners and must remain unchanged.

## Goals / Non-Goals

**Goals:**

- Preserve one deep Dashboard Host interface while concentrating private implementation by reason to change.
- Make the root path and active terminology describe Dashboard ownership.
- Test behavior through the host and page interfaces instead of source layout.

**Non-Goals:**

- Change Dashboard actions, snapshots, persistence, rendering, or user-visible translations.
- Move shared task, toolbar, or migration owners merely because their names mention Dashboard.
- Add adapters, public testing hooks, barrels, dependencies, or compatibility files.

## Decisions

### One root seam and four private modules

`src/modules/dashboardHost.ts` owns the standalone Dialog singleton, embedded/standalone composition, and public lifecycle. It imports `dashboard/dashboardRuntime.ts`; the runtime owns mutable state, caches, refresh publication, subscriptions, and idempotent cleanup. The runtime calls three sibling modules:

- `dashboardSnapshot.ts` builds and finalizes snapshots and their region signatures.
- `dashboardActions.ts` dispatches wire actions through a private focused context supplied by the runtime.
- `dashboardFrame.ts` owns iframe/message-listener and management-overlay lifecycle through callbacks supplied by the runtime.

The siblings do not import the root owner or the runtime. They declare only the private input shapes they consume, preventing circular dependencies and a shared catch-all context module. The alternative—one file per Dashboard page or action family—was rejected because it would create shallow modules with broad interfaces.

### Hard rename without forwarding

The root exports are `openTaskDashboard`, `mountTaskDashboardRuntime`, and `resetTaskDashboardHostForTests`. The unused legacy hook event is deleted without replacement because `openDashboard` already owns the Workspace entry and no production emitter uses the legacy event.

All active code, DOM ids, diagnostic/source values, localization ids, documentation, current specs, and governance paths use Task Dashboard / Dashboard Host names. Archived OpenSpec content is not rewritten. User-visible localized values stay byte-for-byte equivalent except where formatting tools normalize surrounding files.

### Behavior tests are the migration safety net

The existing runtime harness is extracted once under `tests/helpers` and drives the public host interface. Host tests cover mount modes, snapshot publication, refresh scoping/coalescing, action outcomes, and cleanup. Page tests exercise visible interaction and DOM identity through the existing Dashboard runtime. Source-text assertions are deleted when redundant and converted only when they represent stable behavior; CSS tokens, full localized strings, private names, paths, and call order are not recreated as assertions.

### Shared owners remain at root

`dashboardActiveTasks.ts`, `taskDashboardSnapshot.ts`, `taskDashboardHistory.ts`, `dashboardToolbarButton.ts`, `workspaceToolbarTaskPopover.ts`, and `literatureArtifactMigration.ts` remain in their current locations because non-Dashboard callers use their interfaces. Directory cleanliness is achieved by naming the stable seam accurately and locating only its private implementation under `dashboard/`.

## Risks / Trade-offs

- [Action extraction exposes a broad context] → Keep one private dispatcher and pass focused state/effects; do not split by action family in this change.
- [Refresh or DOM lifecycle identity changes during movement] → Establish behavior tests before each extraction and retain the existing signatures, timers, and cleanup order.
- [Hard rename misses a string or path] → Search active roots after the migration; exclude only `openspec/changes/archive`.
- [Behavior-test conversion expands scope] → Delete redundant source assertions rather than recreating one test per token, and reuse existing domain behavior tests.

## Migration Plan

1. Establish the shared behavior harness and green baseline.
2. Rename the root seam and all active identifiers in one compile-fixing slice.
3. Extract frame, runtime/refresh, snapshot, then action implementation, running focused tests after each slice.
4. Update glossary, active docs/specs, localization and governance references.
5. Run the full relevant test, build, localization, and lint gates. Rollback is a normal source revert; there is no data migration.
