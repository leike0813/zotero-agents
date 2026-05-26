## Context

Foundation provides canonical transaction helpers and projection registry state. Tag Vocabulary already validates the canonical-store pattern with a low-coupling domain. Topic synthesis persists complete topic artifacts, but relationships between topics are not yet represented as first-class canonical data.

The topic graph design introduces plugin-owned canonical nodes and edges. Agents may propose relations during topic synthesis, but the plugin owns validation, id generation, state transitions, and user-confirmed edge protection.

## Goals / Non-Goals

**Goals:**

- Store topic graph nodes and edges under `synthesis/topic-graph/`.
- Ingest topic synthesis relation proposal sidecars into suggested edges or diagnostics.
- Preserve user-confirmed and rejected relation decisions.
- Expose a rebuildable `topic-graph-index` projection DTO for Workbench graph organization.
- Add Topics Graph / List / Grid views, graph submodes, and Topic Inspector state.

**Non-Goals:**

- No Concept KB, Citation Graph, Git remote sync, embedding, ontology inference, full graph editor, or drag-line editing.
- No new external MCP tools.
- No real SQLite backend for `topic-graph-index` in this phase.

## Decisions

1. **Sidecar proposal, canonical edge owned by plugin.**  
   Topic synthesis final bundles may reference `topic_graph_relation_proposals_path`. The sidecar is read from the run workspace after topic artifact validation. The plugin converts valid proposals into canonical suggested edges.

2. **Projection stays JSON/DTO for v1.**  
   The projection target is `topic-graph-index`, recorded in Foundation projection registry. This phase writes a rebuildable `state/topic-graph-index.json` DTO and does not introduce SQLite dependencies.

3. **Ingestion failures are non-blocking.**  
   If the sidecar is malformed or a proposal is structurally unsafe, topic synthesis apply remains successful and diagnostics are recorded. The only blocking path is the existing final bundle or structured artifact validation.

4. **Confirmed/rejected edges are protected.**  
   Agent suggestions do not overwrite user-confirmed or user-rejected edges for the same canonical relation tuple. Suggested edges may merge provenance/evidence.

5. **Topics page defaults to graph without removing list/grid.**  
   UI state defaults `artifacts.viewMode` to `graph`, and existing list/grid remains available as lower-risk fallback.

## Risks / Trade-offs

- **Graph semantics can be wrong** -> Agent proposals remain suggested until user confirmation.
- **Cycle checks may be conservative** -> Broader-than cycles are rejected into diagnostics rather than auto-repaired.
- **Projection backend will change later** -> Keep service facade and projection DTO stable so a future SQLite backend can replace local JSON.
- **Skill package change touches prompts/runtime** -> Add only one sidecar action and final bundle field to reduce blast radius.

## Migration Plan

1. Create Topic Graph service and canonical defaults.
2. Upsert materialized topic nodes when topic synthesis apply succeeds.
3. Add optional relation sidecar loading and non-blocking ingestion.
4. Add Workbench snapshot/UI state for topic graph.
5. Keep old topic list/grid views and all existing topic artifact files intact.

## Open Questions

None for this implementation phase.
