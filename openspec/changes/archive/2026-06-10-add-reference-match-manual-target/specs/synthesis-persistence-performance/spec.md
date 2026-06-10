## MODIFIED Requirements

### Requirement: Synthesis Workbench surface reads are bounded

Workbench surface reads SHALL avoid broad recomputation for hot UI paths.

#### Scenario: Review target candidates are read-model based

- **WHEN** Review or Index surfaces include Reference Matching target candidates
- **THEN** the service SHALL build candidates from existing library and canonical
  read models
- **AND** it SHALL NOT run advanced reference matching
- **AND** it SHALL NOT rebuild reference sidecar, graph, tag, or concept indexes.
