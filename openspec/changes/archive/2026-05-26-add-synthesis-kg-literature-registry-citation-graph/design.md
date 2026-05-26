## Context

The repo already contains deterministic registry and citation graph builders in `registry.ts`, `libraryAdapter.ts`, and `citationGraph.ts`. This change promotes those outputs into the Synthesis KG canonical store and keeps graph algorithms plugin-owned and deterministic.

## Goals / Non-Goals

**Goals:**

- Store paper-first registry and citation graph source records as canonical JSON assets.
- Preserve existing Zotero note payload discovery for digest, references, and citation-analysis artifacts.
- Rebuild registry, citation graph, metrics, and layout projections from canonical records.
- Expose latest usable snapshot/freshness state to Workbench and MCP reads.
- Provide a minimal cleanup queue with approve/reject/skip.

**Non-Goals:**

- No Git remote sync, embedding, hosted matching service, complex graph editor, real SQLite/FTS, Concept KB rewrite, Topic Graph semantic changes, or deletion of legacy note payload paths.

## Decisions

1. **Canonical source, JSON projection.**  
   Canonical files live under `synthesis/citation-graph/`; derived registry and graph projections live under `synthesis/state/` as JSON DTOs. No SQLite backend is introduced in this phase.

2. **Paper-first user model.**  
   User-facing registry identity is `paper_ref = <libraryId>:<itemKey>`. Work identity is internal and supports deduplication/reference convergence only.

3. **Existing graph builders remain authoritative.**  
   The implementation reuses `buildPaperRegistryRows`, `buildCitationGraphInputsFromRegistryInputs`, `buildUnifiedCitationGraph`, `computeCitationGraphMetrics`, and `computeCitationGraphLayout`.

4. **Projection reads are bounded and stale-aware.**  
   MCP and Workbench reads prefer canonical-backed projections. Missing or stale projections return structured diagnostics or trigger explicit rebuilds; reads do not silently return raw Zotero objects.

5. **Single-writer job model for v1.**  
   Rebuilds are treated as single-writer operations. Bulk rebuilds may be synchronous in tests and service calls, but persisted state records status, latest usable snapshot, diagnostics, and stale reasons.

6. **Cleanup queue is intentionally small.**  
   Cleanup proposal actions are limited to approve, reject, and skip. They update proposal status and diagnostics without attempting complex auto-merge.

## Risks / Trade-offs

- **Projection size may grow** -> keep this phase JSON/DTO and bounded read APIs; defer SQLite/FTS until schemas stabilize.
- **Bad note payloads should not block registry rebuild** -> write sanitized diagnostics and continue with other papers.
- **Existing callers expect old DTOs** -> service facade preserves `queryCitationGraph`, registry rows, graph slice, and metrics return shapes.

## Migration Plan

1. Add Literature Registry service and canonical defaults.
2. Rebuild canonical records from existing registry inputs and note payload discovery.
3. Rebuild citation graph projections from canonical records using existing deterministic graph code.
4. Route service, Workbench, and MCP read paths to canonical-backed projections with fallback diagnostics.
5. Add focused tests and OpenSpec validation.
