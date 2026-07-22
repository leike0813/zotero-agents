## ADDED Requirements

### Requirement: Library Agent SHALL separate workflow and provider preparation
Library Agent guidance SHALL validate workflow input and backend provider profiles independently and SHALL combine them only when invoking workflow submit.

#### Scenario: Agent prepares a host-owned workflow
- **WHEN** an agent selects a workflow and backend
- **THEN** it reads and validates the workflow contract separately from the backend profile contract
- **AND** reuses a validated profile only when the workflow provider requirements are compatible.

### Requirement: Library Agent SHALL document the ordered research journey
The bounded journey SHALL describe literature search ingest, literature analysis, reference-sidecar refresh, citation-graph update, topic synthesis create/update, and research-bundle export in that order.

#### Scenario: Agent follows the journey
- **WHEN** a stage changes only a subset of papers
- **THEN** the next maintenance stage uses the committed paper scope by default
- **AND** full-library maintenance requires explicit intent or graph bootstrap.
