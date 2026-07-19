# synthesis-citation-graph Specification

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

### Requirement: Unified graph build SHALL have isolated worker parity

The environment-neutral Unified Citation Graph build contract SHALL produce
equivalent strictly rebuilt results in process and through the internal sidecar
canary for wire-bounded full and source-slice requests.

#### Scenario: Full graph fixture is compared
- **WHEN** the same valid full-scope request is executed directly and through the worker canary
- **THEN** nodes, resolved and aggregate edges, ownership, incoming groups, light metrics, and diagnostics SHALL be equivalent

#### Scenario: Source-slice fixture is compared
- **WHEN** the same valid source-slice request is executed directly and through the worker canary
- **THEN** the rebuilt scope and all result collections SHALL be equivalent

### Requirement: Citation graph layout computation SHALL not hold the library write lock


The application service SHALL compute a canonical Citation Graph layout request outside the per-library write lock and SHALL hold that lock only for bounded promotion work.

#### Scenario: Layout engine is delayed

- **WHEN** an injected asynchronous layout engine has not yet completed
- **THEN** the service SHALL NOT retain the library write lock for the duration of the computation.

### Requirement: Citation graph layout promotion SHALL validate its graph basis


The application service SHALL promote computed coordinates only when the current DB graph hash still equals the graph hash used by the layout engine.

#### Scenario: Graph basis is unchanged

- **WHEN** the engine returns a valid result and the current graph hash equals the request graph hash
- **THEN** the service SHALL persist the existing layout shape and layout hash
- **AND** later Workbench reads SHALL observe the promoted coordinates.

#### Scenario: Graph basis changes during computation

- **WHEN** the current graph hash differs from the request graph hash before promotion
- **THEN** the service SHALL leave the previous layout row unchanged
- **AND** it SHALL record the stable `citation_graph_layout_basis_superseded` diagnostic without classifying the engine as failed.

#### Scenario: Engine fails or returns malformed data

- **WHEN** the engine throws, rejects a bounded request, or returns a malformed result
- **THEN** the operation SHALL expose a stable failure diagnostic without raw engine errors
- **AND** it SHALL NOT overwrite the previous readable layout projection.

### Requirement: Citation graph metrics computation SHALL not hold the library write lock


The application service SHALL capture a canonical Citation Graph metrics request under a bounded library lock, compute it outside that lock, and hold the lock again only for bounded promotion work.

#### Scenario: Metrics engine is delayed

- **WHEN** an injected asynchronous metrics engine has not completed
- **THEN** the service SHALL NOT retain the library write lock for the duration of the computation.

#### Scenario: Graph refresh commits before metrics computation

- **WHEN** a full or incremental graph refresh successfully commits graph structure
- **THEN** graph cache readiness SHALL remain readable while complex metrics compute outside the lock
- **AND** metrics freshness SHALL continue to reflect the persisted source graph hash.

### Requirement: Citation graph metrics promotion SHALL validate its graph basis


The application service SHALL replace complex metrics only when the current DB graph hash still equals the graph hash used by the metrics engine.

#### Scenario: Graph basis is unchanged

- **WHEN** the engine returns a valid result and the current graph hash equals the request graph hash
- **THEN** the service SHALL persist the existing metrics rows and canonical metrics hash
- **AND** later reads SHALL report the metrics as current.

#### Scenario: Graph basis changes during computation

- **WHEN** the current graph hash differs from the request graph hash before promotion
- **THEN** the service SHALL leave previous complex metrics rows unchanged
- **AND** it SHALL return the stable `citation_graph_metrics_basis_superseded` diagnostic without classifying the engine as failed.

#### Scenario: Engine fails or returns malformed data

- **WHEN** the engine throws, rejects a bounded request, or returns a malformed result
- **THEN** the operation SHALL expose a stable failure diagnostic without raw engine errors
- **AND** it SHALL NOT delete or overwrite previous complex metrics rows.

### Requirement: Citation graph refresh paths SHALL share metrics orchestration


Full graph rebuild, incremental graph refresh, and explicit metrics refresh SHALL use the same request projection, engine invocation, result rebuilding, and guarded-promotion behavior.

#### Scenario: Any metrics refresh path runs

- **WHEN** complex metrics are requested after a full rebuild, incremental refresh, or manual refresh
- **THEN** the configured metrics engine SHALL be invoked through the shared orchestration
- **AND** each path SHALL apply the same superseded and failure-preservation rules.

### Requirement: Citation graph construction paths SHALL share one build engine


Legacy paper graph projection, full graph cache rebuild, source-slice incremental refresh, and sidecar-backed related-items fallback SHALL route graph assembly through the configured Citation Graph build engine.

#### Scenario: Any graph construction path runs

- **WHEN** a graph is built from legacy papers or resolved production sidecar facts
- **THEN** the configured build engine SHALL own node merging, reference-edge construction, source-target aggregation, role evidence, ownership, incoming groups, and light metrics
- **AND** application adapters SHALL only resolve environment-owned facts and map result envelopes.

### Requirement: Citation graph build promotion SHALL validate its durable basis


The application service SHALL replace full or source-slice Citation Graph rows only when the current durable graph-input basis equals the basis captured before engine computation.

#### Scenario: Build basis is unchanged

- **WHEN** the engine returns a valid result and the durable graph-input basis remains unchanged
- **THEN** the service SHALL transactionally replace the intended graph scope and update cache basis
- **AND** later reads SHALL expose the rebuilt graph.

#### Scenario: Build basis changes during computation

- **WHEN** active raw references, effective canonical redirects, or accepted bindings change before promotion
- **THEN** the service SHALL leave previous graph rows and cache basis unchanged
- **AND** it SHALL expose the stable `citation_graph_build_basis_superseded` diagnostic.

#### Scenario: Engine fails or returns malformed data

- **WHEN** the engine throws, is cancelled, rejects a bounded request, or returns a malformed result
- **THEN** the service SHALL expose a sanitized failure diagnostic
- **AND** it SHALL NOT delete or overwrite the previous active graph.

### Requirement: Citation Graph promotes only basis-current worker layouts

The Citation Graph service SHALL treat sidecar layout output as an untrusted pure
compute result and SHALL promote it only after strict rebuilding and a current
graph-basis check.

#### Scenario: Worker result matches the current graph
- **WHEN** a strict worker result returns for the graph hash that remains current
- **THEN** the plugin repository stores the layout using the existing layout schema

#### Scenario: Worker result is invalid or superseded
- **WHEN** the worker result fails strict rebuilding or the graph basis changes
- **THEN** the result is not stored and the previous layout content is retained

### Requirement: Metrics kernel may execute across the sidecar boundary

Citation Graph refresh SHALL allow the pure metrics kernel to execute remotely
while graph capture, basis comparison, and promotion remain in the plugin.

#### Scenario: Remote result matches current graph
- **WHEN** a strictly rebuilt metrics result returns and the graph basis is unchanged
- **THEN** the existing promotion path stores that result exactly as it would store a direct-engine result

#### Scenario: Remote result is late
- **WHEN** a metrics result returns after its graph basis has been superseded
- **THEN** the existing promotion guards discard it
