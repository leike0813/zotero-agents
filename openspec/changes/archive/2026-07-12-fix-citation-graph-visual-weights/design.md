## Context

The citation graph stores weighted library metrics, but the Workbench projection discarded them and both renderers maintained separate fallback and sizing implementations. Hidden and hover-only edges could therefore affect visible-node importance.

## Goals / Non-Goals

**Goals:**

- Use one shared visual-weighting implementation in both graph renderers.
- Preserve formal incoming-degree metrics through the UI projection.
- Make fallback importance match visible graph semantics.
- Limit isolated-node scores to non-graph age and recency signals.

**Non-Goals:**

- Change graph layout, node colors, current-paper emphasis, or database schema.
- Redefine PageRank for connected library nodes.

## Decisions

- Shared visual rules own fallback degree, importance, and size calculation. This removes two divergent render-time implementations while leaving renderer-specific DOM and z-index behavior local.
- Formal `internal_in_degree` takes precedence. When absent, fallback counts only non-hover edges whose source and target are both supplied visible nodes, with `mention_count` sanitized to an integer minimum of one.
- Positive weighted degrees use `log1p(degree) / log1p(maxDegree + 1)`. The denominator buffer prevents a graph whose only positive degree is one from reaching its size cap, while preserving a continuous distinction between degree magnitudes.
- Isolated nodes retain their raw PageRank for diagnostics but exclude PageRank, in-degree, and out-degree from composite scores. Foundation keeps `0.15 × age_norm`; frontier keeps `0.55 × recency_norm`.
- Metrics version and graph-cache policy version are incremented so persisted scores are recomputed through the existing stale-cache workflow.

## Risks / Trade-offs

- [Formal global metrics and fallback view-local metrics can coexist] → Formal metrics remain authoritative whenever present; fallback is restricted to nodes without them.
- [Existing cached scores could remain stale] → Version changes invalidate the cache rather than requiring a schema migration.
- [Low-degree nodes can still receive a halo when they are the top positive node] → Halo remains a relative visual cue; hidden or visually absent edges can no longer create that cue.

## Migration Plan

1. Deploy the updated metrics and cache-policy versions.
2. Let the existing cache readiness path mark prior graph data stale and rebuild it.
3. Revert by restoring the previous code and versions; no data migration is required.

## Open Questions

None.
