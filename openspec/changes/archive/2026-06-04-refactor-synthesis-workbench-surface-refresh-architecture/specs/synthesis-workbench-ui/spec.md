## ADDED Requirements

### Requirement: Workbench UI renders stable surface containers
Synthesis Workbench UI SHALL keep stable containers for each surface and update only the affected container for surface-local changes.

#### Scenario: Local review decision is queued
- **WHEN** the user queues or cancels a reference review decision
- **THEN** only Review/Index review surfaces and chrome MAY update
- **AND** the Workbench SHALL NOT rebuild the whole DOM.

#### Scenario: Shell-level navigation changes
- **WHEN** the selected top-level tab changes
- **THEN** shell navigation MAY update
- **AND** already mounted unrelated surface containers SHALL NOT be rebuilt because of data refresh elsewhere.

### Requirement: Workbench surfaces expose loading and error states
Each Workbench surface SHALL expose loading, ready, stale, and error states independently.

#### Scenario: Surface read fails
- **WHEN** a surface read fails
- **THEN** the host SHALL send a surface error for that surface
- **AND** other surfaces and chrome SHALL remain usable.
