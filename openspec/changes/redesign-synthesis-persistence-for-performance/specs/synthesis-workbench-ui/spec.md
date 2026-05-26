## MODIFIED Requirements

### Requirement: Workbench snapshots use lightweight SQLite view models

Synthesis Workbench SHALL build snapshots from bounded SQLite view models.

#### Scenario: Snapshot is built

- **WHEN** `getSynthesisSnapshotInput()` builds snapshot input
- **THEN** it SHALL query summary/view-model tables
- **AND** it SHALL NOT scan canonical JSON directories or rebuild JSON
  projections.

#### Scenario: Review action completes

- **WHEN** a review action completes successfully
- **THEN** the next snapshot SHALL reflect the SQLite transaction result
- **AND** it SHALL NOT require a projection rebuild to remove or update the
  review card.

#### Scenario: Large state exists

- **WHEN** the Synthesis database contains thousands of papers or graph nodes
- **THEN** Workbench views SHALL request bounded data for the active view
- **AND** tables/graphs SHALL page, filter, or slice rather than loading all
  records into the DOM.
