## MODIFIED Requirements

### Requirement: Production chrome reuses the operational application projection

The production Workbench chrome and progress reads SHALL reuse the native operational projection for cache readiness and explicit background operations. Chrome SHALL remain bounded and read-only and MUST NOT substitute for a requested content surface. Its observable shape, ordering, refresh scope, and surface DOM identity SHALL remain compatible with the fixed baseline.

#### Scenario: Production Workbench reads chrome
- **WHEN** the current production Workbench requests chrome or progress
- **THEN** it reads bounded native repository state through `SynthesisClient`
- **AND** it does not load Topic, Reference, Graph, Tag, Concept, or review content

#### Scenario: Native projection is unavailable
- **WHEN** the native chrome projection is unavailable or incompatible
- **THEN** production reports the stable unavailable state
- **AND** no plugin or Node fallback runs

#### Scenario: Sidecar canary is unavailable
- **WHEN** the production sidecar Workbench canary is absent, unavailable, or incompatible
- **THEN** production reports the stable unavailable state
- **AND** no automatic sidecar-to-plugin or plugin-to-sidecar fallback branch runs

## ADDED Requirements

### Requirement: Every Workbench surface SHALL have a domain projection

Home, Topics, Review, Tags, Concepts, Reader, Index, and Graph SHALL each be produced by its own bounded native application projection. A requested surface MUST NOT fall back to maintenance chrome or a success-shaped placeholder.

#### Scenario: Named surface is opened
- **WHEN** Workbench requests one named surface
- **THEN** Rust reads only that surface's required domain state and requested page/filter
- **AND** hidden surfaces are not loaded or rebuilt

#### Scenario: Surface is not implemented
- **WHEN** a named surface lacks its real domain projection during migration
- **THEN** it reports a stable unavailable state
- **AND** it does not return maintenance chrome as surface content

### Requirement: Workbench reads SHALL preserve native-service semantics

Workbench DTOs SHALL preserve the fixed baseline's stable fields, readiness distinction, ordering, recommended commands, and read-only behavior. Index rows SHALL carry counts by default and load raw references only for an explicit bounded detail/reference scope.

#### Scenario: Index default page is read
- **WHEN** Workbench opens the default Index surface
- **THEN** rows include bounded summary and reference counts
- **AND** full raw-reference arrays are absent until explicitly requested

#### Scenario: Workbench read is compared before and after
- **WHEN** a surface read completes without an explicit mutation
- **THEN** repository facts, cache bases, operations, canonical files, and Host effects remain unchanged

### Requirement: External domain mutations SHALL invalidate their Workbench surfaces

Successful mutations performed through a workflow or another Workbench-external Host consumer SHALL publish the exact affected surface set. The Workbench SHALL mark those surfaces dirty and immediately reload the active surface when it is affected, without refreshing unrelated content surfaces.

#### Scenario: Workflow mutates Tag vocabulary state
- **WHEN** a workflow successfully saves the controlled Tag vocabulary, stages suggestions, or discards staged suggestions
- **THEN** the Host SHALL invalidate the Tags surface
- **AND** an open Tags surface SHALL reload from Synthesis state so staged count, rows, and available actions reflect the committed mutation

#### Scenario: Tags surface is not active
- **WHEN** a successful workflow Tag mutation occurs while another Workbench surface is active
- **THEN** the Tags surface SHALL remain dirty until it is selected
- **AND** Index, Graph, Review, and other unrelated content surfaces SHALL NOT reload solely because of that Tag mutation
