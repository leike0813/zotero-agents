## ADDED Requirements

### Requirement: Workbench maintenance renders WorkItems

Workbench maintenance SHALL render Synthesis work from WorkItems.

#### Scenario: Work is pending or running

- **WHEN** WorkItems exist
- **THEN** the snapshot SHALL expose `maintenance.workQueue` aggregate counts
  and `maintenance.workItems.rows`
- **AND** it SHALL NOT expose `maintenance.updateQueue` or
  `maintenance.backgroundJobs` as the Synthesis work contract.

#### Scenario: Git Sync is shown with Synthesis work

- **WHEN** Git Sync appears in Synthesis maintenance UI
- **THEN** it SHALL be represented through a WorkItem projection adapter or
  migrated into the Work Registry
- **AND** it SHALL NOT be a third independent background-job source.
