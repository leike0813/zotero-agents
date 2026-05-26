## Why

Synthesis KG has canonical foundations for tags, topic graph, and concept KB, but paper registry and citation graph still depend on transient projections over Zotero notes. Literature Registry and Citation Graph is the next roadmap phase because registry, reference matching, graph metrics, Workbench Index/Graph, and topic synthesis graph inputs should share one canonical source.

## What Changes

- Add a Literature Registry + Citation Graph canonical domain under `synthesis/citation-graph/`.
- Persist paper, work, work redirect, reference instance, reference resolution, citation context, cleanup proposal, and manifest files through Foundation transactions.
- Rebuild JSON/DTO projections for literature registry index, citation graph snapshot, metrics, layouts, freshness, and job state without adding SQLite dependencies.
- Route existing registry/citation graph service and UI reads through canonical-backed projections while preserving existing DTO compatibility.
- Add Workbench Literature filters, latest usable graph snapshot handling, topic-neighborhood graph data, and cleanup queue actions.
- Do not implement Git remote sync, embeddings, hosted matching, complex graph editing, real SQLite/FTS, or removal of existing note payload discovery.

## Capabilities

### New Capabilities

- `synthesis-literature-registry-citation-graph`: Paper-first literature registry, reference instances/resolutions, citation contexts, cleanup proposals, projection, freshness, job state, diagnostics, and citation graph rebuild behavior.

### Modified Capabilities

- `synthesis-paper-registry`: Paper registry becomes canonical-backed while preserving existing payload discovery and bounded registry rows.
- `synthesis-citation-graph`: Deterministic graph, metrics, and layout projections rebuild from canonical registry/reference records.
- `synthesis-workbench-ui`: Workbench Index becomes a Literature view, Graph reads latest usable citation snapshots, and cleanup actions are exposed.
- `synthesis-mcp-tools`: Existing read-only paper registry, citation graph slice, and metrics tools read canonical-backed projections.

## Impact

- Affects Synthesis service internals, registry/citation graph projection reads, Workbench UI model/app, host command routing, and focused core tests.
- Adds no npm dependency and no external MCP write surface.
- Uses existing Foundation canonical transaction, diagnostics, and projection registry helpers.
