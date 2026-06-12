## ADDED Requirements

### Requirement: Surface refresh responses SHALL be generation guarded

Synthesis Workbench surface refresh payloads SHALL carry request generation
metadata and stale responses SHALL NOT overwrite current UI state.

#### Scenario: Earlier surface request resolves after a newer request

- **WHEN** the host starts two refreshes for the same surface
- **AND** the earlier refresh resolves after the later refresh has been accepted
- **THEN** the earlier response SHALL be ignored by the iframe
- **AND** it SHALL NOT replace `state.snapshot` or the visible surface content.

#### Scenario: Scheduled active refresh runs after tab switch

- **WHEN** an active-surface refresh is scheduled for one surface
- **AND** the user switches to another surface before the scheduled callback runs
- **THEN** the host SHALL drop the scheduled refresh
- **AND** it SHALL NOT reinterpret the callback as a refresh for the new active surface.

### Requirement: Surface errors SHALL preserve last-known-good data

Surface refresh failures SHALL NOT clear valid previously rendered data.

#### Scenario: Surface refresh fails after data was rendered

- **WHEN** a visible surface already has a last-known-good snapshot
- **AND** a later refresh for that surface fails
- **THEN** the Workbench SHALL keep the last-known-good surface content visible
- **AND** it SHALL show a refresh diagnostic for the failed refresh.
