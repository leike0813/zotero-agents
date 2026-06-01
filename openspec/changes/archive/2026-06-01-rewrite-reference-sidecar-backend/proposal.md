## Why

Reference Sidecar refresh currently mixes new sidecar cache rows with legacy Registry projections, state files, and Workbench background-job fallbacks. This can show a failed or running "Reference sidecar refresh" task after the actual refresh has completed.

This change rewrites the Reference Sidecar / Index / Citation Graph cache / job-status backend as a small explicit-operation kernel and updates docs so future work does not reconnect old Registry synchronization paths.

## What Changes

- **BREAKING** Stop deriving Reference Sidecar readiness from legacy sidecar state files, sidecar index files, graph index files, or graph manifests.
- **BREAKING** Split Reference Sidecar refresh from Citation Graph cache rebuild. Refresh updates sidecar rows and marks graph cache stale; graph cache rebuild is a separate explicit operation.
- Add `rebuildCitationGraphCacheNow` and `retryCitationGraphCacheRebuild` service/host commands.
- Use `synt_operation` only for running/failed/completed operation progress, and `synt_cache_basis` only for data readiness.
- Remove full Registry projection APIs from active Sidecar paths.
- Update Workbench, MCP/debug diagnostics, docs, and invariant tests to describe the new operation/cache-basis model.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-sidecar-cache`: Define split refresh/rebuild behavior and cache-basis readiness.
- `synthesis-reference-sidecar-citation-graph`: Require explicit graph cache rebuild from sidecar rows and bindings.
- `synthesis-workbench-ui`: Change Graph stale/missing actions and background-job derivation.
- `synthesis-job-progress-reporting`: Make operation rows the only long-running progress source for this path.
- `synthesis-mcp-tools`: Report sidecar/graph cache readiness without starting refresh or reading legacy state.
- `synthesis-persistence-performance`: Split refresh and graph rebuild budgets.
- `synthesis-invariant-guardrails`: Add guards against legacy projection/state-file reattachment.
- `synthesis-layer-doc-system`: Require docs to match the split operation model.

## Impact

- Synthesis service refresh/rebuild methods, Workbench host command routing, UI model command labels, and Graph tab actions.
- Repository operation/cache-basis helpers and legacy cleanup behavior.
- Reference Sidecar, Citation Graph, Workbench UI, MCP/debug tests, invariant guards, and docs under `doc/synthesis-layer`.
