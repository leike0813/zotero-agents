## ADDED Requirements

### Requirement: Citation Graph reads SHALL remain available during graph computation

Citation Graph application reads SHALL use bounded reader transactions from the repository reader pool. Host collection and build, metrics, and layout computation SHALL execute without holding the repository writer lock; writer ownership SHALL be limited to bounded basis validation and promotion transactions.

#### Scenario: A graph build is computing
- **WHEN** worker computation is blocked or long-running while a last-good graph exists
- **THEN** a concurrent page read returns the last-good graph through a reader transaction
- **AND** it does not wait for computation to release the writer

#### Scenario: Promotion completes after a concurrent read
- **WHEN** a read begins before promotion and another read begins after promotion commits
- **THEN** each read returns one coherent graph basis
- **AND** only the later read observes the promoted graph

