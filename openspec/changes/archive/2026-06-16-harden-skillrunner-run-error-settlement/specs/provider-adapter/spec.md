## MODIFIED Requirements

### Requirement: SkillRunner provider dispatch MUST not fabricate terminal failed after request creation

SkillRunner provider/queue integration MUST treat post-create transport or backend availability failures as recoverable plugin-side diagnostics, but MUST NOT recover terminal run-level client errors for a known request.

#### Scenario: request-created transport failure stays pending for reconciler

- **GIVEN** provider dispatch targets a SkillRunner backend
- **WHEN** provider dispatch has already created backend `requestId`
- **AND** a later upload, polling, or result request fails due to network error, timeout, `429`, or `5xx`
- **THEN** foreground execution MUST keep that request pending for reconciler
- **AND** plugin MUST preserve request context and request ledger ownership

#### Scenario: upload-backed request-created does not start observation

- **GIVEN** provider dispatch targets a SkillRunner backend and the request requires upload
- **WHEN** provider dispatch emits `request-created`
- **THEN** plugin MUST record the `requestId` for dispatch ownership
- **AND** plugin MUST NOT create recoverable observation context, open run UI, or start run polling for that request yet
- **WHEN** the upload step succeeds and provider emits `request-ready`
- **THEN** plugin MAY start the normal SkillRunner workspace observation and recoverable context flow

#### Scenario: request-created run-level client failure settles failed

- **GIVEN** provider dispatch has already created SkillRunner `requestId`
- **WHEN** upload, initial state fetch, polling, or result fetch returns `400`, `404`, `410`, or `422` for that request
- **THEN** provider execution MUST mark the local job/request as failed
- **AND** job queue MUST NOT coerce it back to `running`
- **AND** plugin MUST NOT preserve or create recoverable context for that failed request
- **AND** plugin MUST NOT mark the backend unreachable solely because of that run-level client error

#### Scenario: backend terminal state remains terminal

- **GIVEN** provider dispatch has already created SkillRunner `requestId`
- **WHEN** backend state for that request is terminal `failed` or `canceled`
- **THEN** foreground execution MUST preserve the terminal job result
- **AND** job queue MUST NOT convert it into recoverable pending state
