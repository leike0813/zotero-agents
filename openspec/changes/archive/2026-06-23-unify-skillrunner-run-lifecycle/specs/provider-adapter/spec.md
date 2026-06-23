## ADDED Requirements

### Requirement: SkillRunner provider lifecycle MUST be runKey-first

SkillRunner provider execution MUST create or receive a stable local `runKey` before backend request creation; backend `requestId` is correlation attached to that run.

#### Scenario: Request id attaches without re-key

- **GIVEN** a SkillRunner run has local `runKey` and no `requestId`
- **WHEN** the backend returns `request-created`
- **THEN** the provider adapter MUST attach the returned `requestId` to that
  same `runKey`
- **AND** it MUST NOT create a replacement task row keyed by `requestId`.

#### Scenario: Pre-request run stays visible

- **GIVEN** a SkillRunner backend request has not yet been created
- **WHEN** provider execution enters the submit path
- **THEN** the adapter MUST preserve a projectable `queued/pre_request` run
  record keyed by `runKey`.

### Requirement: SkillRunner provider terminal ownership MUST exclude observer failures

SkillRunner provider terminal ownership MUST record local observer failures as detached observation, not terminal provider failure, after a run has a backend `requestId`.

#### Scenario: Post-request observer failure detaches observation

- **GIVEN** a SkillRunner run has `runKey` and `requestId`
- **WHEN** frontend observation fails with a local network, abort, shutdown, or
  polling timeout error
- **THEN** the provider adapter MUST record `observerState = "detached"`
- **AND** the run MUST remain active and recoverable.

#### Scenario: Backend terminal state remains authoritative

- **GIVEN** a SkillRunner run has `runKey` and `requestId`
- **WHEN** the backend reports terminal `failed` or `canceled`
- **THEN** the provider adapter MAY settle the run with that terminal state.

#### Scenario: Terminal client errors are bounded

- **GIVEN** a SkillRunner run has not yet received `requestId`
- **WHEN** request creation fails with a nonrecoverable client contract error
- **THEN** the provider adapter MAY settle the run as terminal local failure.

### Requirement: SkillRunner sequence steps MUST enter provider execution as first-class runs

A SkillRunner step inside a sequence workflow MUST use the same provider execution lifecycle as a single SkillRunner job; sequence ids annotate the run only.

#### Scenario: Sequence step uses the same provider run path

- **GIVEN** a sequence workflow starts a SkillRunner step
- **WHEN** the step is submitted to the provider adapter
- **THEN** the adapter MUST operate on a `SkillRunnerRunRecord` keyed by
  `runKey`
- **AND** the run MAY include `sequenceRunId`, `sequenceJobId`, and
  `sequenceStepId`.

#### Scenario: Synthetic step projection cannot delete provider truth

- **GIVEN** a sequence SkillRunner step has a projectable run record
- **WHEN** sequence orchestration observes step failure or detachment
- **THEN** the provider adapter MUST NOT delete or replace the SkillRunner run
  projection through a synthetic step job.

Invariant anchors:

- `INV-SR-RUNKEY-LOCAL-SSOT`
- `INV-SR-REQUESTID-ATTACH-NO-REKEY`
- `INV-SR-SEQUENCE-STEP-FIRST-CLASS-RUN`
- `INV-SR-OBSERVER-FAILURE-NONTERMINAL`
- `INV-SR-BACKEND-TERMINAL-OWNER`
