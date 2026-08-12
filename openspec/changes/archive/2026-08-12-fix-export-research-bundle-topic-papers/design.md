## Context

See `proposal.md` for motivation. Stage 40 currently calls `topics.get_context` without a view and parses the legacy flat `resolved_paper_set`. That field is a saved resolver-result snapshot. The same response already exposes the Topic artifact's canonical literature table as `semantic.source_papers` when requested with `view: "semantic"`.

The resolver's `paper_refs` are selector inputs, while current resolver matches are freshness/update evidence. Neither represents the papers adopted by the current Topic artifact. Direct Topic research-bundle export already uses artifact `source_papers`, so no new Host capability is necessary.

## Goals / Non-Goals

**Goals:**

- Align automatic Research Bundle discovery with the current Topic artifact's paper membership.
- Preserve valid Topic candidates even when another selected Topic is incomplete.
- Make degraded discovery visible and prevent false confirmed-empty outcomes.
- Reuse existing candidate, provenance, assessment, and materialization paths.

**Non-Goals:**

- Re-running Topic resolvers or repairing Topic artifacts during a read-only workflow.
- Treating resolver selectors or freshness snapshots as Topic membership fallbacks.
- Changing final Research Product diagnostics, layout, manifest, or output schema.
- Adding Host Bridge capabilities, database state, or new test files.

## Decisions

### Read the purpose-specific semantic view

Stage 40 will request `{topicId, view: "semantic"}` and parse only `semantic.source_papers[].paper_ref`. This is the smallest existing interface that exposes the current Topic literature table without hydrating the full artifact or mixing in audit-only resolver state.

Using the legacy resolved-set snapshot was rejected because it can be stale or empty independently of the current artifact. Falling back to `topic_resolver.paper_refs` was rejected because those refs are selectors subject to the resolver's tag, collection, and union/intersection semantics.

### Degrade per Topic, decide status after all discovery

Unavailable context and missing, malformed, empty, or partially invalid source tables produce Topic-scoped structured diagnostics. Valid refs from the same or other Topics are retained, and bounded metadata anchors still run.

Stage 40 becomes `ready` when any reliable canonical candidate exists. If discovery yields no candidate while any selected Topic was incomplete, it remains `incomplete`; only fully valid, explicitly empty discovery may become `empty_confirmed`. This retains useful work without turning unknown Topic evidence into a business claim that no literature exists.

### Keep diagnostics in runtime audit state

The existing discovery summary, stage result, gate, and action receipt remain the diagnostic path. Stable codes carry the Topic id and source classification. The final Research Bundle stays unchanged because the user selected runtime-only visibility and the current Product contract does not need another warning projection.

### Extend existing tests before implementation

The Stage 40 bridge fixture will model semantic envelopes and the divergent regression case where the saved resolved set is empty while current `source_papers` is populated. Existing Synthesis integration coverage will lock the public semantic field's ownership. No static instruction-text tests or duplicate test files will be added.

## Risks / Trade-offs

- [Older Topic artifacts lack a usable source table] → Continue bounded metadata discovery, expose a stable Topic-scoped diagnostic, and refuse confirmed-empty status when no candidate is found.
- [Partially invalid source rows hide valid rows] → Accept canonical rows, diagnose each dropped invalid row, and retain the Topic's degraded status for zero-candidate classification.
- [Semantic response shape drifts] → Treat missing or malformed envelopes as degraded Topic context and lock the existing response through focused integration coverage.
- [Runtime-only diagnostics are absent from a completed Product] → Preserve them in SQLite-backed stage and receipt audit surfaces as explicitly chosen; do not expand the Product schema in this fix.

## Migration Plan

1. Publish the updated Skill package and workflow documentation together.
2. Existing in-progress runs remain SQLite-authoritative; recomputing Stage 40 reads the current semantic Topic context and rewrites its discovery summary.
3. Rollback restores the previous content package. No schema or data migration is required.
