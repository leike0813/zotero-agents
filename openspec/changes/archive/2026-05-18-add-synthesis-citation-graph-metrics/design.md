# Design

## Metrics Projection

Citation graph metrics are a deterministic derived projection, similar to graph
layouts. They are computed from the persisted Unified Citation Graph and are not
part of the citation fact layer.

The first version computes formal rows only for `library_paper` nodes. External
and unresolved nodes participate in coverage diagnostics and external/unresolved
counts, but they do not receive formal metric rows.

## Algorithms

- Degree metrics use edge `mention_count` as weight.
- PageRank is computed only on the library-paper subgraph with citation direction
  `source -> cited target`, damping `0.85`, and `50` deterministic iterations.
- Weak components are computed on the undirected library-paper subgraph.
- `graph_year` is the maximum valid year among library paper nodes. Missing
  years yield zero age/recency normalized values.
- Foundation score uses
  `0.50 * in_degree_norm + 0.35 * pagerank_norm + 0.15 * age_norm`.
- Frontier score uses
  `0.55 * recency_norm + 0.25 * out_degree_norm + 0.20 * pagerank_norm`.

## Storage and DTO

The metrics asset is stored at
`state/unified-citation-graph-metrics.json` as a canonical envelope whose data
schema is `synthesis.unified_citation_graph_metrics`.

`synthesis.get_citation_graph_metrics` returns a bounded DTO. It supports
default top-ranked output and explicit `paperRefs` lookup. It never rebuilds the
graph and reports missing/stale metrics instead.

`synthesis.get_citation_graph_slice` may attach compact metrics summaries to
returned nodes when the metrics snapshot hash matches the graph hash.
