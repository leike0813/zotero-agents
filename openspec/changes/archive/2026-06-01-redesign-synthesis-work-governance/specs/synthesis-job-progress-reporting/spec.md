## ADDED Requirements

### Requirement: WorkRun progress replaces standalone job progress

Synthesis progress SHALL be reported through WorkItems and WorkRuns.

#### Scenario: Worker reports progress

- **WHEN** a Synthesis worker reports processed, failed, skipped, total, phase,
  or heartbeat data
- **THEN** the current WorkItem projection and current WorkRun SHALL be updated
- **AND** no separate job-state source SHALL be needed for Workbench.

#### Scenario: Raw run history is requested

- **WHEN** debug tooling requests run history for a WorkItem
- **THEN** the response SHALL include bounded WorkRun rows
- **AND** Workbench SHALL continue to render from WorkItems.
