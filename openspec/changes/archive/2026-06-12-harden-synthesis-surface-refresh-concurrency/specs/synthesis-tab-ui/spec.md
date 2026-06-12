## ADDED Requirements

### Requirement: Temporary backend read failures SHALL be visible diagnostics

The Synthesis Workbench UI SHALL distinguish temporary backend read failures
from genuine empty data states.

#### Scenario: Transient storage busy occurs during surface refresh

- **WHEN** a surface refresh fails with a transient storage-busy diagnostic
- **THEN** the UI SHALL display a refresh/busy diagnostic
- **AND** it SHALL NOT render the normal empty state as if the backend returned no rows.

#### Scenario: No previous surface data exists

- **WHEN** a transient surface error occurs before any last-known-good snapshot exists
- **THEN** the UI SHALL render an explicit diagnostic panel
- **AND** it SHALL explain that data could not be read temporarily.
