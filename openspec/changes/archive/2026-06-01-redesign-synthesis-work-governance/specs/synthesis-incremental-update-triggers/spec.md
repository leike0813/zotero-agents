## ADDED Requirements

### Requirement: Synthesis updates are WorkItem driven

Automatic Synthesis maintenance SHALL be driven by durable WorkItems.

#### Scenario: Workflow apply changes paper artifacts

- **WHEN** a workflow apply hook changes paper-level artifacts
- **THEN** it SHALL enqueue scoped `paper_registry_incremental` WorkItems
- **AND** downstream workers SHALL claim those WorkItems under budget.

#### Scenario: Multiple triggers target the same scope

- **WHEN** multiple triggers target the same paper, work, topic, or graph scope
- **THEN** the Work Registry SHALL coalesce them into one active compatible
  WorkItem.

### Requirement: Startup reconcile is WorkItem governed

Startup reconcile SHALL be represented as a WorkItem.

#### Scenario: Plugin starts with existing registry state

- **WHEN** startup reconcile runs
- **THEN** it SHALL compare lightweight Zotero fingerprints with registry
  facets
- **AND** it SHALL enqueue bounded follow-up WorkItems for differences
- **AND** it SHALL NOT keep separate detector queue state.

### Requirement: Background workers are budgeted and pausable

Synthesis background workers SHALL process WorkItems through bounded owner queues.

#### Scenario: Worker budget is exhausted

- **WHEN** a worker reaches its batch or time budget
- **THEN** unclaimed WorkItems SHALL stay queued
- **AND** claimed unfinished work SHALL remain observable through WorkItem and
  WorkRun state.
