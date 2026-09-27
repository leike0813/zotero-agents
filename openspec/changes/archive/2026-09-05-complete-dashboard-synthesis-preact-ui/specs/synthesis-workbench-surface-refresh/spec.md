## MODIFIED Requirements

### Requirement: Surface refresh is scoped to one area

Workbench surface updates SHALL refresh only the requested surface container.

#### Scenario: Index surface updates
- **WHEN** the host sends an `index` surface update
- **THEN** the frontend SHALL update content within the existing Index surface container while preserving that container's identity
- **AND** it SHALL NOT rebuild Graph, Tags, Concepts, Review, or the shell.

#### Scenario: Chrome updates
- **WHEN** operation progress changes
- **THEN** the host SHALL send chrome state only
- **AND** content surfaces SHALL NOT be refreshed.
