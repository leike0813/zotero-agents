## Why

Synthesis Workbench is now DB-first for normal operation, but several UI read
paths still treat legacy JSON projections or missing layout files as part of
the live Workbench state. This makes a clean SQLite-backed graph appear empty or
not ready, and lets stale file state affect Home, Topics, Cleanup, Graph, and
background job displays.

## What Changes

- Make Workbench UI hot paths read only SQLite-backed repository/runtime state.
- Remove legacy JSON/canonical/projection fallback from Workbench snapshot,
  topic options, registry summaries, cleanup rows, deleted rows, conflicts, and
  background jobs.
- Add DB-backed citation graph layout state for the bounded Workbench graph
  view.
- Make citation graph layout refresh automatic when DB graph structure exists.
- Let Graph UI render available DB graph data while layout is missing, running,
  dirty, or refreshing instead of blocking on `layoutStatus === "ready"`.
- Add debug worker support for `citationGraphLayout` so CLI diagnostics can
  verify layout refresh without using the UI.

## Capabilities

### New Capabilities

- `synthesis-workbench-db-first-ui-read-paths`: Workbench UI read models use
  SQLite repository state as the only live source.
- `synthesis-citation-graph-db-layout`: Citation graph layout state is stored
  and refreshed from DB graph rows.

### Modified Capabilities

- `synthesis-workbench-ui`: Graph tab renders DB graph data and refreshes layout
  asynchronously.
- `synthesis-literature-registry-citation-graph`: citation graph layout worker
  is DB-backed for Workbench graph layout.

## Impact

- Synthesis repository and schema: additive layout state table/API.
- Synthesis service: snapshot assembly, layout worker, debug worker, and
  maintenance background jobs.
- Workbench host/UI: graph refresh trigger and graph empty/drawing rendering.
- Tests: UI read-path regressions, citation graph DB layout, debug worker, and
  repository schema coverage.
