## REMOVED Requirements

### Requirement: SkillRunner provider dispatch MUST classify post-create failures by request scope

**Reason**: Request identity alone does not establish readiness; the old upload-recovery scenario conflicts with current submission behavior.

**Migration**: Use the readiness-and-run-scope classification requirement below, retaining terminal client-error and backend-terminal behavior.

### Requirement: SkillRunner sequence terminal apply MUST be reconciler-owned

**Reason**: Normal sequences are foreground-owned; the blanket reconciler rule contradicts current execution.

**Migration**: Use the execution-ownership requirement below, which retains the recovery-owned reconciler scenario and adds the foreground case.

### Requirement: SkillRunner provider dispatch MUST stop at request-ready

**Reason**: Current providers continue foreground polling, result retrieval and waiting continuation after request-ready.

**Migration**: Use the foreground-execution requirement below, retaining pre-ready failure diagnostics and explicit recovery ownership.

## ADDED Requirements

### Requirement: SkillRunner dispatch failures MUST respect readiness and run scope

SkillRunner execution MUST classify failures using request readiness and run scope. Pre-ready failures SHALL terminate submission; post-ready transport or availability failures SHALL preserve recovery ownership, while terminal run-level client errors SHALL remain terminal.

#### Scenario: request-ready transport failure stays pending for recovery

- **GIVEN** provider dispatch targets a SkillRunner backend
- **WHEN** the request has reached `request-ready`
- **AND** a later polling or result request fails due to network error, timeout, `429`, or `5xx`
- **THEN** foreground execution MUST preserve the request for recovery-owned settlement
- **AND** plugin MUST preserve request context and request ledger ownership

#### Scenario: upload-backed request-created does not start recovery

- **GIVEN** provider dispatch targets a SkillRunner backend and the request requires upload
- **WHEN** provider dispatch emits `request-created`
- **THEN** plugin MUST record the `requestId` for dispatch ownership
- **AND** plugin MUST NOT treat that identity alone as evidence of request readiness or start recoverable polling
- **WHEN** upload succeeds and provider emits `request-ready`
- **THEN** the request SHALL be eligible for recoverable observation
- **AND** local submission progress SHALL remain visible through its existing run identity throughout submission

#### Scenario: request-created run-level client failure settles failed

- **GIVEN** provider dispatch has already created SkillRunner `requestId`
- **WHEN** upload, initial state fetch, polling, or result fetch returns `400`, `404`, `410`, or `422` for that request
- **THEN** provider execution MUST mark the local job/request as failed
- **AND** settlement MUST NOT coerce it back to `running`
- **AND** plugin MUST NOT preserve or create recoverable context for that failed request
- **AND** plugin MUST NOT mark the backend unreachable solely because of that run-level client error

#### Scenario: backend terminal state remains terminal

- **GIVEN** provider dispatch has already created SkillRunner `requestId`
- **WHEN** backend state for that request is terminal `failed` or `canceled`
- **THEN** foreground execution MUST preserve the terminal job result
- **AND** settlement MUST NOT convert it into recoverable pending state

### Requirement: SkillRunner sequence terminal apply MUST follow execution ownership

SkillRunner sequence steps MUST use the same foreground-versus-recovery ownership model as ordinary SkillRunner jobs. Each step's declared apply SHALL finish before continuation to the next step.

#### Scenario: Foreground applies terminal SkillRunner sequence step

- **GIVEN** a SkillRunner sequence step remains foreground-owned
- **WHEN** its provider returns terminal success
- **THEN** foreground orchestration SHALL resolve the step result from the SkillRunner result namespace
- **AND** SHALL execute its declared `apply_result` before continuing to the next step

#### Scenario: Reconciler applies recovery-owned SkillRunner sequence step

- **GIVEN** a SkillRunner sequence step is tracked by recovery-owned context
- **WHEN** the backend reports terminal success for that request
- **THEN** the reconciler SHALL fetch terminal result material and resolve the step result JSON from the SkillRunner result namespace
- **AND** SHALL execute the declared `apply_result` before continuing to the next step
- **AND** settlement SHALL NOT duplicate foreground apply

### Requirement: SkillRunner provider dispatch MUST preserve foreground execution after request-ready

SkillRunner provider execution SHALL create and initialize its request, then continue foreground observation and result retrieval. Waiting SHALL retain the existing continuation owner; recovery-owned settlement SHALL handle detached foreground observation.

#### Scenario: upload success continues foreground polling

- **WHEN** `/v1/jobs` returns a request id and upload or initialization succeeds
- **THEN** the provider SHALL record `request-ready` and continue polling
- **AND** terminal success SHALL fetch the requested result or bundle
- **AND** waiting for user input or authentication SHALL return a deferred result with foreground continuation

#### Scenario: pre-ready failure remains foreground terminal

- **WHEN** create, upload, or initialization fails before `request-ready`
- **THEN** the provider SHALL fail workflow dispatch and retain local submission failure visibility
- **AND** no recoverable observation SHALL be created merely because a request id exists
- **AND** runtime diagnostics SHALL include the stage and request id when one exists

#### Scenario: request-ready run retains execution ownership

- **WHEN** a SkillRunner request reaches `request-ready`
- **THEN** its run identity SHALL be registered for observation
- **AND** normal foreground result retrieval, apply and sequence continuation SHALL retain their existing owners
- **AND** detached recoverable observation SHALL transfer to recovery-owned settlement
