# Apply Citation Graph Metrics to Topic Synthesis Skills

## Why

The Synthesis service can now compute deterministic citation graph metrics, but
the create/update topic synthesis skills do not consume them. As a result, the
agent still treats all resolved papers mostly as a flat workset and misses useful
signals about foundational papers, frontier papers, isolated nodes, and
external-heavy library coverage.

## What Changes

- Add `synthesis.get_citation_graph_metrics` to the create/update synthesis
  workflow MCP requirements.
- Persist run-local metrics receipts after resolver/workset creation and before
  artifact export.
- Add compact graph metrics blocks to the Stage 5 Markdown contexts.
- Require per-paper analysis rows to include a graph metrics interpretation.
- Document that metrics are auxiliary structure signals only and never direct
  evidence for claims or timeline events.

## Impact

- Affects `create-topic-synthesis` and `update-topic-synthesis` skill packages.
- Adds no graph algorithms and no new host persistence model.
- Does not change resolved paper set membership.
