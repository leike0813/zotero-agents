## ADDED Requirements

### Requirement: Backend health gating MUST NOT suppress direct observation of active SkillRunner runs

SkillRunner observe and reconcile logic SHALL distinguish backend-level health
state from direct state checks for already-known active runs.

#### Scenario: flagged backend still polls active run

- **WHEN** a SkillRunner backend is marked health-flagged
- **AND** a projectable active run with a backend request id is already known
- **THEN** the reconciler SHALL still attempt direct `/v1/jobs/{request_id}`
  polling in the `reconcile` lane
- **AND** a successful poll SHALL clear the backend health failure state

#### Scenario: health failure gates only non-critical observe

- **WHEN** a backend health probe fails or is delayed
- **THEN** non-critical background observe MAY be backed off or gated
- **AND** submit, terminal settlement, and direct active-run reconciliation SHALL
  remain schedulable

### Requirement: Background history sync MUST NOT drive terminal settlement

SkillRunner terminal settlement SHALL be driven by reconciler state polling and
settlement fetches, not by background history synchronization.

#### Scenario: history timeout does not block state poll

- **WHEN** a background history or gap-sync request is slow or times out
- **THEN** `/v1/jobs/{request_id}` terminal polling SHALL still be able to run
  in the `reconcile` lane
- **AND** the history timeout SHALL NOT mark the backend unreachable by itself
