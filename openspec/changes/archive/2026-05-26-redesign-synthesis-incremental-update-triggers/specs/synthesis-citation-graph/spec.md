## MODIFIED Requirements

### Requirement: Citation graph rebuild persists metrics

Citation graph maintenance SHALL persist structure, layout, and metrics as
separate derived projections. Read methods SHALL report stale status instead of
rebuilding when persisted projections are missing or stale.

#### Scenario: Graph structure is updated

- **WHEN** affected paper or work reference scopes are processed by a citation
  structure worker
- **THEN** graph structure and lightweight metrics SHALL be persisted
- **AND** layout SHALL NOT be recomputed unless graph UI or an explicit command
  requires it.

#### Scenario: Metrics are stale

- **WHEN** persisted metrics exist but their `graph_hash` differs from the
  persisted graph
- **THEN** metrics reads SHALL report stale status instead of rebuilding.

#### Scenario: Read observes missing projection

- **WHEN** `queryCitationGraph()`, `getCitationGraphSlice()`, or
  `getCitationGraphMetrics()` observes missing projection state
- **THEN** it SHALL return bounded diagnostics or latest usable data
- **AND** it SHALL NOT enqueue structure, metrics, or layout rebuild work.

## ADDED Requirements

### Requirement: Citation graph structure updates incrementally

Citation graph structure SHALL update from affected source papers, target works,
or reference resolution scopes instead of requiring full graph rebuild for
routine maintenance.

#### Scenario: One paper reference set changes

- **WHEN** one paper reference facet changes
- **THEN** citation structure work SHALL recompute that paper's outgoing edges
- **AND** unrelated source papers SHALL NOT be recomputed.

#### Scenario: Work resolution changes

- **WHEN** a reference target work resolution changes
- **THEN** citation structure work SHALL update affected source and target edge
  groups
- **AND** latest usable graph projection SHALL remain readable during the work.

### Requirement: Citation metrics are layered

Citation graph metrics SHALL separate lightweight metrics from complex metrics.

#### Scenario: Structure worker runs

- **WHEN** citation structure is updated
- **THEN** lightweight metrics such as degree-like counts and resolution counts
  SHALL update with structure when possible.

#### Scenario: Complex metrics are stale

- **WHEN** complex metrics require graph-wide or large-subgraph computation
- **THEN** they SHALL be marked stale or partial
- **AND** a low-priority background metrics job SHALL update them.

### Requirement: Citation graph layout is on demand

Citation graph layout SHALL be recomputed only when graph UI or an explicit
command needs a newer layout.

#### Scenario: Graph UI opens with stale layout

- **WHEN** Graph UI opens and the layout `source_graph_hash` is older than the
  current structure hash
- **THEN** latest usable graph data SHALL be shown immediately
- **AND** layout work MAY be queued in the background.

#### Scenario: MCP reads graph metrics

- **WHEN** MCP or CLI reads graph metrics
- **THEN** layout recomputation SHALL NOT be triggered.
