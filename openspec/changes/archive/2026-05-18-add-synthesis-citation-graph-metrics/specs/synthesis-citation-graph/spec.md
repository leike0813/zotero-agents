# synthesis-citation-graph

## ADDED Requirements

### Requirement: Citation graph metrics are deterministic derived assets

The Synthesis service SHALL compute citation graph metrics from the deterministic
Unified Citation Graph and SHALL treat metrics as a rebuildable projection, not
as citation facts.

#### Scenario: Metrics are computed for library papers

- **WHEN** a Unified Citation Graph contains library, external, and unresolved
  nodes
- **THEN** formal metrics rows SHALL be generated only for library paper nodes
- **AND** external and unresolved nodes SHALL be represented only in diagnostics
  and source-node external/unresolved counts.

#### Scenario: Metrics are deterministic

- **WHEN** the same graph is scored twice
- **THEN** PageRank, degree metrics, component ids, scores, role hints, and
  `metrics_hash` SHALL be identical.

### Requirement: Citation graph rebuild persists metrics

Citation graph rebuild SHALL persist graph, layout, and metrics snapshots
together.

#### Scenario: Graph is rebuilt

- **WHEN** `queryCitationGraph()` rebuilds the graph
- **THEN** `state/unified-citation-graph-metrics.json` SHALL be written
- **AND** the metrics snapshot SHALL record the current `graph_hash`.

#### Scenario: Metrics are stale

- **WHEN** persisted metrics exist but their `graph_hash` differs from the
  persisted graph
- **THEN** metrics reads SHALL report stale status instead of rebuilding.
