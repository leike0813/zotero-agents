## Why

Literature Registry and Citation Graph now have canonical-backed rebuild facades and JSON projections, but callers still have to trigger rebuilds explicitly. This leaves Workbench and read-only tools without a durable freshness/job model for stale or missing projections.

## What Changes

- Add a Synthesis literature background job worker with single-worker queueing, debounce, persistent job state, and retry/backoff.
- Persist literature job state under `synthesis/state/literature-registry-job-state.json`.
- Expose literature freshness/job state through Synthesis service and Workbench snapshots.
- Keep latest usable registry/citation graph projection readable during retryable failures.
- Declare the current projection backend as JSON/DTO and explicitly defer SQLite/FTS/BM25.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `synthesis-literature-registry-citation-graph`: Adds background rebuild job state, freshness scheduling, retry/backoff, and backend declaration.
- `synthesis-citation-graph`: Clarifies latest usable citation graph projection behavior and JSON/DTO backend metadata.
- `synthesis-workbench-ui`: Shows literature/citation projection freshness and manual rebuild/retry commands.
- `synthesis-mcp-tools`: Keeps read-only DTOs bounded when projections are stale or missing.

## Impact

- Affects Synthesis literature registry service, Synthesis service facade, Workbench UI model/rendering, and core tests.
- Adds no npm dependency and does not create SQLite, FTS, or BM25 files.
