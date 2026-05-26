# synthesis-citation-graph Specification

## Purpose
TBD - created by archiving change add-synthesis-citation-graph. Update Purpose after archive.
## Requirements
### Requirement: Citation graph is deterministic and plugin-owned

Unified Citation Graph SHALL be built by deterministic plugin code from canonical literature registry records and SHALL NOT depend on LLM inference.

#### Scenario: Graph is built from canonical papers and references

- **WHEN** canonical paper and reference instance records are available
- **THEN** the graph SHALL contain library paper nodes, target reference nodes, and citation edges directed from citing paper to cited target
- **AND** repeated rebuilds from the same canonical records SHALL produce the same graph hash.

### Requirement: External references use provisional reference keys

External and unresolved reference nodes SHALL use deterministic provisional
reference keys.

#### Scenario: DOI is available

- **WHEN** DOI is available
- **THEN** the provisional key SHALL use normalized DOI before title/year/author.

#### Scenario: Title, year, and first author are available

- **WHEN** DOI, arXiv, and URL are unavailable
- **THEN** title + year + first author SHALL be a deterministic strong key.

### Requirement: External references are promoted when they enter the library

Graph rebuild SHALL promote external/unresolved targets to library paper nodes
when provisional keys match.

#### Scenario: Reference key matches a library paper

- **WHEN** a reference provisional key matches a library paper provisional key
- **THEN** citation edges SHALL target the library paper node
- **AND** the old provisional key SHALL be retained as an alias or promotion
  diagnostic.

### Requirement: Citation edges aggregate repeated source-target references

Repeated source-target citations SHALL be represented as one edge.

#### Scenario: Same paper cites same target repeatedly

- **WHEN** one source paper cites the same target multiple times
- **THEN** the graph SHALL contain one edge
- **AND** `mention_count` SHALL equal the number of mentions.

### Requirement: Citation roles are projected from existing evidence

Citation role labels SHALL come from existing citation analysis evidence only.

#### Scenario: Multiple roles exist for one edge

- **WHEN** role evidence contains multiple labels
- **THEN** one `primary_role` SHALL be selected by evidence count, configured
  priority, then lexicographic label
- **AND** remaining roles SHALL be stored as `aux_roles`.

### Requirement: Layout snapshots are deterministic derived assets

Citation graph layout snapshots SHALL be derived from graph hash and preset.

#### Scenario: Same graph and preset are laid out twice

- **WHEN** layout is computed twice for the same graph and preset
- **THEN** persisted coordinates and layout hash SHALL be identical.

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

Citation graph rebuild SHALL persist graph, layout, and metrics snapshots together as rebuildable projection DTOs derived from canonical literature registry records.

#### Scenario: Graph is rebuilt

- **WHEN** `queryCitationGraph()` rebuilds the graph
- **THEN** `synthesis/state/citation-graph-index.json`, metrics, and layout projection files SHALL be written
- **AND** the metrics snapshot SHALL record the current `graph_hash`
- **AND** latest usable snapshot state SHALL be updated.

#### Scenario: Metrics are stale

- **WHEN** persisted metrics exist but their `graph_hash` differs from the persisted graph
- **THEN** metrics reads SHALL report stale status instead of returning misleading ready data.

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

### Requirement: Citation graph projection exposes latest usable snapshot state

Synthesis Citation Graph SHALL expose stale/missing/running state without deleting the latest usable JSON projection.

#### Scenario: Background rebuild fails

- **WHEN** citation graph rebuild fails retryably
- **THEN** the previous usable graph projection SHALL remain readable
- **AND** diagnostics SHALL report retry state rather than returning raw library objects.

#### Scenario: Projection backend is JSON DTO

- **WHEN** citation graph projection is rebuilt
- **THEN** the projection SHALL declare backend `json-dto`
- **AND** no SQLite/FTS/BM25 artifact SHALL be created.

