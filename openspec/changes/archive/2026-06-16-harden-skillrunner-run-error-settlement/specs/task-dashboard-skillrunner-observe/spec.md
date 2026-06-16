## MODIFIED Requirements

### Requirement: request-created local failure MUST remain recoverable non-terminal state

Plugin MUST distinguish backend terminal failure from plugin-side communication failure after SkillRunner request creation.

#### Scenario: request-created communication failure remains recoverable

- **WHEN** a SkillRunner request has already emitted `request-ready`
- **AND** later plugin-side communication fails due to network error, timeout, `429`, or `5xx`
- **THEN** plugin MUST keep the task in a recoverable non-terminal state
- **AND** plugin MUST preserve request context and request ledger ownership
- **AND** plugin MUST continue reconcile/sync against backend truth

#### Scenario: request-created does not start upload-backed run observation

- **WHEN** a SkillRunner request has emitted `request-created` but has not emitted `request-ready`
- **THEN** plugin MUST NOT start run polling, event history sync, chat stream, session sync, or interaction UI for that request
- **AND** plugin MUST NOT issue `/v1/jobs/{requestId}` or `/v1/jobs/{requestId}/events/history` observation requests for that request solely because of `request-created`

#### Scenario: request-ready run-level client failure stops observation

- **WHEN** a SkillRunner request has already emitted `request-ready`
- **AND** run polling, pending sync, chat stream, event stream, or interaction action returns `400`, `404`, `410`, or `422` for that request
- **THEN** plugin MUST settle the request as failed in local task/dashboard projections
- **AND** plugin MUST stop observer loops and session sync for that request
- **AND** plugin MUST NOT continue sending reply, cancel, auth import, poll, chat, or event requests for that request
- **AND** plugin MUST NOT gate or hide the whole backend solely because of that request-level failure

### Requirement: Backend reconcile gating MUST control interaction entry points

Backend reconcile gating MUST remain backend-scoped and MUST NOT be triggered by terminal client errors for a single known request.

#### Scenario: run-level 404 does not gate backend

- **WHEN** a SkillRunner run interaction returns `404` for a known `backendId + requestId`
- **THEN** plugin MUST mark only that request failed
- **AND** dashboard backend tab and workspace backend group MUST remain governed by backend health probe state
- **AND** backend reconcile flag MUST NOT be set solely from that 404 response
