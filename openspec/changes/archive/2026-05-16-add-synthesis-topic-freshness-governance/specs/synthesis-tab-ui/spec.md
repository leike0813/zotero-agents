## ADDED Requirements

### Requirement: Synthesis Workbench displays topic artifact freshness

The Synthesis Workbench SHALL display freshness from the Synthesis service
instead of hard-coded values.

#### Scenario: Artifact row uses scanned freshness

- **WHEN** Workbench receives a snapshot
- **THEN** each topic artifact row SHALL show the service-provided freshness
  state
- **AND** `dirty` SHALL be accepted as a valid freshness filter value.

#### Scenario: Workbench refresh scans freshness

- **WHEN** Workbench opens or the user refreshes the snapshot
- **THEN** the host SHALL return a snapshot after the service has scanned active
  topic freshness
- **AND** it SHALL NOT start an agent update workflow automatically.
