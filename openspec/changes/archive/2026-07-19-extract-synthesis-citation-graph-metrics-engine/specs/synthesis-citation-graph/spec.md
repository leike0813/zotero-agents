## ADDED Requirements

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
