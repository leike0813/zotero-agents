## 1. OpenSpec

- [x] 1.1 Create proposal, design, delta specs, and tasks for the change.
- [x] 1.2 Validate the OpenSpec change in strict mode.

## 2. Literature Registry Service

- [x] 2.1 Add canonical DTO types for papers, works, redirects, reference instances, resolutions, contexts, cleanup proposals, manifest, diagnostics, projection, and job state.
- [x] 2.2 Implement canonical initialization, load, rebuild, manifest hashing, diagnostics, and Foundation transaction writes under `synthesis/citation-graph/`.
- [x] 2.3 Reuse existing registry and citation graph builders to create JSON projections for registry index, graph snapshot, metrics, layouts, freshness, and latest usable snapshot state.
- [x] 2.4 Implement cleanup proposal list and approve/reject/skip helpers.

## 3. Synthesis Service Integration

- [x] 3.1 Add literature registry facade methods to Synthesis service.
- [x] 3.2 Route `queryCitationGraph`, registry reads, graph slice reads, and metrics reads through canonical-backed projection state while preserving existing DTO compatibility.
- [x] 3.3 Ensure projection missing/stale states return structured diagnostics or explicit rebuild behavior without exposing raw Zotero objects.

## 4. Workbench UI

- [x] 4.1 Add Literature filter state for All, Library items, Reference-only, Matched, Ambiguous, Unresolved, Needs cleanup, and Stale.
- [x] 4.2 Render latest usable graph snapshot/freshness state and rebuild command in Graph view.
- [x] 4.3 Add cleanup queue state and route approve/reject/skip host commands.

## 5. Tests and Validation

- [x] 5.1 Add core tests for canonical records, manifest, projection stale state, BBT alias stability, graph/metrics/layout rebuild, cleanup actions, and sanitized diagnostics.
- [x] 5.2 Extend existing registry, citation graph, MCP, and Workbench UI tests for canonical-backed projection behavior.
- [x] 5.3 Run focused OpenSpec, core, TypeScript, and formatting validations.
