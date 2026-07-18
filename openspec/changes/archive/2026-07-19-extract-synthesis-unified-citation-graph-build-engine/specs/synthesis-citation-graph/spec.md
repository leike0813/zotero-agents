## ADDED Requirements

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
