## ADDED Requirements

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
