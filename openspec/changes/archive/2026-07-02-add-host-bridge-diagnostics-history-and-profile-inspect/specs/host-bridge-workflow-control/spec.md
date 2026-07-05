## ADDED Requirements

### Requirement: Host Bridge SHALL expose redacted diagnostics and profile inspection

Host Bridge SHALL provide authenticated diagnostics endpoints for profile inspection and backend status that expose only redacted, lightweight operational state.

#### Scenario: Profile inspect is redacted

- **WHEN** a client calls `GET /bridge/v1/diagnostics/profile`
- **THEN** the response includes protocol, endpoint mode, connection mode, capability/catalog summary, and safety rules
- **AND** the response does not include bearer tokens, master tokens, backend private payloads, or local private paths.

#### Scenario: Backend status is redacted

- **WHEN** a client calls `GET /bridge/v1/diagnostics/backends/{backendId}`
- **THEN** the response includes backend id, type, display name, enabled state, readiness summary, and compact last error when available
- **AND** the response does not include backend auth, credential-bearing URLs, or provider private payloads.

### Requirement: Workflow validation SHALL not start execution

Host Bridge SHALL provide workflow validation and requirements endpoints that reuse workflow submit/describe validation without starting tasks or requesting execution approval.

#### Scenario: Workflow validation checks compatibility only

- **WHEN** a client calls `POST /bridge/v1/workflows/validate`
- **THEN** Host Bridge validates selection, workflow options, and provider profile compatibility
- **AND** no workflow task, backend run, Zotero mutation, or execution approval request is created.

### Requirement: Permission visibility SHALL be read-only

Host Bridge SHALL expose pending permission request summaries without allowing CLI approval or rejection.

#### Scenario: Permission pending lists summaries

- **WHEN** a Host Bridge permission request is waiting
- **THEN** `GET /bridge/v1/permissions/pending` returns its request id, action, summary, scope, related run handles, creation time, and state
- **AND** the response does not include the original private payload.

### Requirement: Runtime history SHALL be lightweight

Host Bridge SHALL expose recent task, workflow run, skill run, and skill-run event views as lightweight metadata only.

#### Scenario: Skill-run events are not transcripts

- **WHEN** a client calls `GET /bridge/v1/skill-runs/{skillRunId}/events`
- **THEN** the response includes lifecycle/progress events derived from inbox/task/run projections
- **AND** it excludes transcripts, workspace paths, full error text, and provider private payloads.
