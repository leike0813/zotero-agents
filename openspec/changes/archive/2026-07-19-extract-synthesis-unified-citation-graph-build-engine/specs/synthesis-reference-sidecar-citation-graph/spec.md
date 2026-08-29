## ADDED Requirements

### Requirement: Production graph build SHALL separate durable-fact capture from graph assembly

Production Citation Graph construction SHALL capture active sidecar facts and effective canonical/binding targets through the application repository, read current Zotero metadata through Host capabilities, and send only resolved JSON-safe facts to the build engine.

#### Scenario: Production graph build is delayed

- **WHEN** Host metadata loading or the configured build engine has not completed
- **THEN** the per-library write lock SHALL NOT remain held
- **AND** no graph rows SHALL be replaced.

#### Scenario: Source slice is built

- **WHEN** incremental refresh supplies affected source refs
- **THEN** durable-fact capture and basis validation SHALL use the same source scope
- **AND** successful promotion SHALL preserve unrelated source graph rows.

### Requirement: Related-items fallback SHALL reuse production graph resolution

Sidecar-backed related-items fallback SHALL use the same resolved-reference projection and build-engine result used by production Citation Graph construction without persisting a graph cache.

#### Scenario: Graph cache is unavailable

- **WHEN** related-items sync resolves accepted library-to-library edges directly from active sidecar facts
- **THEN** it SHALL invoke the configured graph build engine
- **AND** it SHALL consume accepted resolved edges without replacing graph cache rows.
