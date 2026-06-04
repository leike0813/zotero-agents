## ADDED Requirements

### Requirement: Workbench progress updates chrome only
Synthesis Workbench progress reporting SHALL update operation chrome without refreshing content surfaces.

#### Scenario: Long-running operation reports progress
- **WHEN** a Synthesis operation emits progress
- **THEN** the host SHALL send a chrome update containing operation/job state
- **AND** it SHALL NOT send a full snapshot or reload the active surface unless the operation completes and invalidates that surface.
