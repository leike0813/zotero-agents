## MODIFIED Requirements

### Requirement: Synthesis Workbench renders from DB-first state

Workbench snapshots SHALL derive normal UI rows, options, graph state, cleanup
rows, and background jobs from SQLite-backed Synthesis repository/runtime state,
not from legacy JSON/canonical files.

#### Scenario: Legacy files exist but DB is empty

- **GIVEN** old canonical or projection files exist under Synthesis runtime
  paths
- **AND** the SQLite Synthesis repository has no corresponding live rows
- **THEN** Workbench Home, Topics, Cleanup, Deleted Artifacts, Graph, topic
  options, and background jobs SHALL render the DB-empty state
- **AND** those legacy files SHALL NOT inject UI rows or task status.

### Requirement: Background jobs do not duplicate queue aggregates

Workbench background jobs SHALL contain concrete observable work rows, not a
queue aggregate duplicate of the same dirty events.

#### Scenario: One dirty event is queued

- **GIVEN** the Synthesis update queue has one queued dirty event
- **WHEN** Workbench background jobs are projected
- **THEN** the concrete dirty-event row MAY be shown
- **AND** `maintenance.summary.pendingDirtyCount` SHALL report the pending count
- **AND** no separate `Synthesis update queue` background job row SHALL be added
  for the same aggregate.

#### Scenario: Startup reconcile dirty work is queued

- **GIVEN** startup reconcile has emitted
  `startup_reconcile_detected_dirty_items`
- **WHEN** Workbench background jobs are projected
- **THEN** the concrete dirty-event row MAY be shown
- **AND** no separate queued `Startup reconcile` row SHALL be added for the
  same generated work.
