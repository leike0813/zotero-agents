## ADDED Requirements

### Requirement: SkillRunner observation MUST read run-store projections

Dashboard, popover, RunDialog, and assistant workspace observation SHALL use
SkillRunner run-store projections as their source of task state.

#### Scenario: request-ready is first visible projection

- **WHEN** a SkillRunner request is created but upload or initialization has not
  reached request-ready
- **THEN** observers SHALL NOT show a task row for that run
- **AND** pre-ready failure SHALL be surfaced by dispatch diagnostics or toast

#### Scenario: deferred apply remains visible after terminal success

- **WHEN** a SkillRunner run is terminal succeeded
- **AND** its apply state is `pending`, `running`, or `failed`
- **THEN** observers SHALL keep the run visible with the apply state and error
  summary
- **AND** the run SHALL NOT silently disappear from Dashboard or popover

#### Scenario: host-side settlement failure is observable

- **WHEN** result parse, bundle artifact lookup, apply hook, Host Bridge, or
  store write failure occurs during settlement
- **THEN** observers SHALL receive a failed or retryable apply projection
- **AND** no UI indicator SHALL remain indefinitely in waiting state without a
  recorded error or next retry time
