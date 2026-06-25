## ADDED Requirements

### Requirement: SkillRunner event observation MUST require ready visible ownership

Dashboard and workspace event observation MUST be gated by a post-upload ready context or a user-visible task projection. A backend `request_id` observed at `request-created` is not sufficient to start event-session sync.

#### Scenario: request-created without request-ready does not start events

- **GIVEN** a SkillRunner backend has returned a `request_id` for a new request
- **AND** upload has not completed and no `request-ready` context exists
- **WHEN** frontend dispatch bookkeeping, request ledger, dashboard refresh, or workspace refresh sees that request id
- **THEN** plugin MUST NOT start `events/history -> events SSE` for that request
- **AND** plugin MUST NOT open an interaction UI for that request solely from `request-created`
- **AND** plugin MUST NOT issue repeated `/v1/jobs/{request_id}/events/history` requests for that pre-ready request

#### Scenario: invisible request does not drive session sync

- **GIVEN** a SkillRunner `backendId + requestId` exists in internal bookkeeping
- **AND** there is no active or history task projection visible to the user for that request
- **WHEN** session sync is requested for that request
- **THEN** plugin MUST skip or stop event-session sync for that request
- **AND** plugin MUST preserve dispatch/ledger bookkeeping without creating an observer-only invisible task

### Requirement: SkillRunner queued run event observation MUST be bounded

Dashboard and run-workspace observation MUST avoid repeatedly starting event-session sync for SkillRunner requests that remain `queued` without observable state changes.

#### Scenario: long-unchanged queued request does not restart event history every tick

- **GIVEN** a SkillRunner request has emitted `request-ready`
- **AND** the request snapshot remains `queued` across repeated observations
- **WHEN** dashboard or workspace observation refreshes
- **THEN** plugin MUST NOT start a new `events/history -> events SSE` session for that request on every refresh tick
- **AND** plugin MUST use bounded request-local cadence before trying queued-state event sync again
- **AND** the task MUST remain visible in dashboard/workspace projections

#### Scenario: running and waiting requests remain session-sync eligible

- **WHEN** a SkillRunner request is observed as `running`, `waiting_user`, or `waiting_auth`
- **THEN** plugin MAY start or maintain the normal state/session sync chain for that request
- **AND** queued-state throttling MUST NOT prevent interactive prompt/auth observation after the state changes

#### Scenario: queued observation throttling does not gate backend

- **WHEN** plugin throttles event observation for an unchanged queued SkillRunner request
- **THEN** plugin MUST NOT mark the backend unreachable solely because of that throttling
- **AND** backend tab and backend group interactivity MUST continue to follow backend health probe state

### Requirement: SkillRunner session sync start MUST be idempotent under unchanged state

SkillRunner session sync start requests MUST be idempotent for a request whose relevant non-terminal state has not changed.

#### Scenario: duplicate start request reuses or skips existing sync

- **GIVEN** session sync has already been started or recently attempted for a SkillRunner request
- **WHEN** another observer path asks to start sync for the same unchanged request state
- **THEN** plugin MUST reuse the existing sync or skip the duplicate start according to request-local cadence
- **AND** plugin MUST NOT open parallel event-history loops for the same request
