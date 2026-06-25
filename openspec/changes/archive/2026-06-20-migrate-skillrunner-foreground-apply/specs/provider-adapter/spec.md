## ADDED Requirements

### Requirement: SkillRunner provider terminal and waiting ownership

The SkillRunner provider SHALL own normal `skillrunner.job.v1` foreground
settlement after `request-ready`.

#### Scenario: Terminal success is fetched before provider completion

- **WHEN** a SkillRunner job reaches `succeeded`
- **THEN** provider execution SHALL fetch `/result` or `/bundle`
- **AND** return a terminal success result that is ready for foreground
  `applyResult`.

#### Scenario: Backend terminal failure remains local terminal failure

- **WHEN** a SkillRunner job reaches `failed` or `canceled`
- **THEN** provider execution SHALL return the matching local terminal outcome
- **AND** foreground apply SHALL NOT run.

#### Scenario: Waiting detaches without timeout failure

- **WHEN** polling observes `waiting_user` or `waiting_auth`
- **THEN** provider execution SHALL return a foreground-owned deferred result
  with waiting metadata
- **AND** `poll.timeout_ms` SHALL NOT convert that waiting state to failure.
- **AND** the deferred result SHALL NOT include a separate `frontendStatus`
  request-ready marker.

### Requirement: Pre-ready failures are terminal local failures

Failures before `request-ready` SHALL fail the local workflow job instead of
creating background reconciler ownership.

#### Scenario: Submit or upload timeout happens before request-ready

- **WHEN** create or upload fails before the projectable run is ready
- **THEN** the job SHALL be marked failed locally
- **AND** no missing-context reconciler scan SHALL be required to settle it.
