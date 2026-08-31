## ADDED Requirements

### Requirement: SkillRunner run store SHALL use one event write seam

SkillRunner run state writers SHALL submit `SkillRunnerRunEvent` values to
`applySkillRunnerRunEvent`. The store reducer SHALL atomically update the
materialized run record, append one audit event, and notify subscribers.
Callers SHALL NOT append audit events directly or mutate run records through
per-field write functions.

#### Scenario: One event produces one record transition and one audit event

- **WHEN** a run event is applied
- **THEN** the run record SHALL transition exactly once
- **AND** one audit event SHALL be appended with the same event type and payload
- **AND** subscribers SHALL be notified once

#### Scenario: Missing run events preserve null behavior

- **WHEN** a non-create run event references a missing runKey
- **THEN** `applySkillRunnerRunEvent` SHALL return null
- **AND** SHALL NOT fabricate a run record or audit event

#### Scenario: Terminal guard remains authoritative

- **WHEN** a run reached a terminal status
- **THEN** a later non-terminal event SHALL NOT move the record backwards
- **AND** the audit event SHALL still be appended

### Requirement: SkillRunner run lifecycle events SHALL use the event seam

Archive and delete SHALL be submitted as `run.archived` and `run.deleted`
events. Archive SHALL keep the run record with archival timestamps. Delete
SHALL remove the run record while retaining existing event history.

#### Scenario: Archive event preserves runKey and request identity

- **WHEN** a run is archived through the event seam
- **THEN** the run record SHALL remain readable with its original runKey and
  request identity
- **AND** `archivedAt` SHALL be set

#### Scenario: Delete event removes only the run record

- **WHEN** a run is deleted through the event seam
- **THEN** the run record SHALL be removed
- **AND** its event history SHALL be removed with it
