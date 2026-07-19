## Purpose

Citation Graph stores graph structure, metrics, and Workbench layout as stale-tolerant sidecar cache projections built from active references and bindings.
## Requirements
### Requirement: Citation graph Workbench layout is stored in DB

The Synthesis repository SHALL store Workbench citation graph layout state in
SQLite as runtime state separate from graph structure and metrics.

#### Scenario: Layout state is created

- **WHEN** an explicit citation graph layout operation computes a layout for a
  bounded Workbench graph view and algorithm
- **THEN** the repository SHALL persist the layout coordinates, graph hash,
  algorithm key, status, diagnostics, and update timestamp
- **AND** later Workbench snapshots SHALL read that state from SQLite.

#### Scenario: Layout is stale

- **WHEN** the stored layout graph hash differs from the current DB graph hash
  or the stored layout version is older than the current layout version
- **THEN** the snapshot SHALL report layout status `stale`
- **AND** it MAY include the old coordinates for optimistic rendering.

#### Scenario: Layout operation runs without legacy projection

- **WHEN** SQLite citation graph rows exist
- **AND** legacy citation graph projection files are missing
- **THEN** the layout operation SHALL compute layout from SQLite graph rows
- **AND** it SHALL NOT require legacy graph index files.

### Requirement: Debug operation can run citation graph layout

The debug operation runner SHALL support running citation graph layout refresh.

#### Scenario: Debug citation graph layout operation is requested

- **WHEN** `debug.synthesis.worker.run` is called with
  `worker: "citationGraphLayout"`
- **THEN** the service SHALL run the DB-backed citation graph layout operation
- **AND** the result SHALL include before and after diagnostics showing layout
  state changes.

### Requirement: Citation graph supports multiple layout algorithms

The Citation Graph layout operation SHALL support a default force layout and
lightweight deterministic alternatives.

#### Scenario: Force layout is requested

- **WHEN** the layout algorithm is `force`
- **THEN** the service SHALL compute one d3-force layout using the default force
  parameters
- **AND** it SHALL NOT compute compact, balanced, or expanded force variants.

#### Scenario: Radial layout is requested

- **WHEN** the layout algorithm is `radial`
- **THEN** the service SHALL compute deterministic coordinates without force
  iterations
- **AND** library nodes SHALL be ordered by citation importance with higher
  incoming citation nodes closer to the center.

#### Scenario: Components layout is requested

- **WHEN** the layout algorithm is `components`
- **THEN** the service SHALL compute deterministic coordinates without force
  iterations
- **AND** connected components SHALL be separated visually.

#### Scenario: Legacy preset input is received

- **WHEN** a caller requests `compact`, `balanced`, or `expanded`
- **THEN** the service SHALL treat the request as `force`.

### Requirement: Citation graph exposes topic-scoped cluster statistics

Citation graph services SHALL expose bounded topic-scoped cluster data for
deterministic topic synthesis statistics.

#### Scenario: Topic source refs are queried

- **WHEN** a topic synthesis runtime asks for a cluster around resolved source
  paper refs
- **THEN** the graph service SHALL return counts and summaries for source
  papers, internal edges, external references, canonical references, unresolved
  references, year span, role hints, and graph status
- **AND** the response SHALL be bounded by explicit node/reference limits.

#### Scenario: Graph cache is stale

- **WHEN** cluster data cannot be trusted because graph/cache state is stale
- **THEN** the response SHALL include a structured stale diagnostic
- **AND** it SHALL NOT trigger graph rebuild or refresh as part of the read.

### Requirement: Workbench citation graph aggregates source-target evidence before display selection

The Citation Graph read model SHALL expose at most one citation edge for each source-target pair, and it SHALL derive an external target's incoming degree from distinct library source nodes rather than raw reference instances.

#### Scenario: One library paper repeats an external reference

- **WHEN** one library source paper contains multiple reference instances that resolve to the same external target
- **THEN** the read model SHALL expose one source-target edge with accumulated mention, role, and source-reference evidence
- **AND** the external target SHALL have incoming degree one
- **AND** the target and edge SHALL remain hover-only and SHALL NOT participate in default layout computation.

#### Scenario: Multiple library papers share an external reference

- **WHEN** at least two distinct library source papers cite the same external target
- **THEN** the external target SHALL have incoming degree equal to the number of distinct library sources
- **AND** the target SHALL participate in the default graph and layout
- **AND** repeated references from one source SHALL increase only that source-target edge's mention evidence.

#### Scenario: Raw reference provenance is retained

- **WHEN** multiple raw reference instances are aggregated into one graph edge
- **THEN** the persisted reference-instance records SHALL remain unchanged
- **AND** the graph edge SHALL retain the contributing source references and accumulated role evidence.

