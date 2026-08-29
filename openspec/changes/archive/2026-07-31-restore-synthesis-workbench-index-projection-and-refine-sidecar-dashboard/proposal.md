## Why

Native Reference Refresh now commits successfully, but the production Workbench compatibility route returns the operational Workbench DTO as if it were a UI snapshot. The Index UI therefore never receives `registry.cacheStatus` or `registry.rows`, falls back to `missing`, and remains empty after an explicit UI refresh.

The debug-only Synthesis Sidecar Dashboard also renders event status as plain text, presents the selected event only as one large JSON block, and provides no visible result after copying JSON.

## What Changes

- Restore the existing Workbench public contract by adapting native operational chrome to the UI maintenance projection and by producing a bounded, current-library-backed Index surface.
- Share one typed Reference Index fact projection between the public Reference Sidecar Index and Workbench adapters while preserving their distinct wire shapes.
- Derive Reference Sidecar readiness only from `synt_cache_basis`, including the valid ready-and-empty-library state.
- Add colored event-status badges, a structured event summary plus full JSON detail layout, and visible copy success/failure feedback to the debug-only Dashboard.
- Extend production-route and browser UI regression tests, then package only the current-platform sidecar for local retesting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-native-topic-workbench-surface`: Native Workbench chrome and Index reads return their existing public UI projection rather than an internal operational DTO.
- `synthesis-reference-sidecar-index`: Index rows are a bounded join of current Zotero Library items and scoped sidecar facts, and readiness is independent of row count.
- `synthesis-sidecar-debug-observability`: Debug events use consistent status badges, structured detail, and visible clipboard feedback.

## Impact

The change affects the Rust Reference/Workbench compatibility projection and scoped repository reads, the debug-only Dashboard renderer and styles, focused Core/UI tests, OpenSpec deltas, and the current-platform packaged sidecar. It adds no dependency, database schema, production capability, remote prebuild, release, commit, or push.
