## ADDED Requirements

### Requirement: SkillRunner provider dispatch MUST stop at request-ready

SkillRunner provider execution SHALL create and initialize the backend request,
then hand post-ready work to reconciler-owned settlement.

#### Scenario: upload success returns deferred without foreground polling

- **WHEN** `/v1/jobs` returns a request id
- **AND** the upload or initialization request succeeds
- **THEN** the provider SHALL record a `request-ready` SkillRunner run
- **AND** it SHALL return a deferred provider result
- **AND** it SHALL NOT poll `/v1/jobs/{requestId}`
- **AND** it SHALL NOT fetch `/result` or `/bundle`

#### Scenario: pre-ready failure remains foreground terminal

- **WHEN** create, upload, or initialization fails before `request-ready`
- **THEN** the provider SHALL fail the workflow dispatch
- **AND** no user-visible SkillRunner run projection SHALL be created
- **AND** runtime diagnostics SHALL include the stage and request id when one
  exists

#### Scenario: request-ready run is registered for settlement

- **WHEN** a SkillRunner request reaches `request-ready`
- **THEN** plugin SHALL register the run for reconciler-owned terminal
  settlement
- **AND** foreground provider code SHALL NOT own apply, retry, or sequence
  continuation for that run

### Requirement: SkillRunner post-ready errors MUST be classified by run scope

SkillRunner HTTP failures after `request-ready` SHALL distinguish terminal
run-level client errors from backend-level recoverable failures.

#### Scenario: run-level client error fails only current run

- **WHEN** post-ready state, result, bundle, or interaction requests return
  `400`, `404`, `410`, or `422`
- **THEN** plugin SHALL settle the affected SkillRunner run as failed
- **AND** it SHALL NOT mark the whole backend unreachable

#### Scenario: recoverable backend failure preserves submit availability

- **WHEN** post-ready state, result, bundle, or interaction requests fail with a
  network error, timeout, `429`, or `5xx`
- **THEN** plugin MAY use retry, backoff, or backend-health handling
- **AND** later submit/create/upload requests SHALL remain able to run
