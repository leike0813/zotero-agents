# Add Synthesis Citation Graph Metrics

## Why

The Unified Citation Graph currently stores deterministic citation facts,
diagnostics, and layout snapshots, but it does not compute quantitative library
paper indicators. Topic synthesis and review workflows therefore cannot
deterministically identify core, foundational, frontier, isolated, or
external-heavy papers from the citation graph.

## What Changes

- Add a deterministic `graph_metrics` derived projection for library paper nodes.
- Compute weighted in/out degree, library-only PageRank, weak components,
  graph-year-normalized recency/age, foundation/frontier scores, and synthesis
  role hints.
- Persist `state/unified-citation-graph-metrics.json` whenever the citation
  graph is rebuilt.
- Expose bounded metrics through `synthesis.get_citation_graph_metrics`.
- Attach compact metrics summaries to citation graph slice nodes when a matching
  metrics snapshot exists.

## Impact

- Affects Synthesis citation graph rebuilds, persisted state assets, MCP tools,
  and graph DTOs.
- Does not change graph fact construction, layout coordinates, topic timeline
  semantics, sync/recovery shard scope, or Topic Detail UI.
