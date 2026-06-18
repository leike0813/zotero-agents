## ADDED Requirements

### Requirement: SkillRunner pre-ready requests MUST not become invisible observer tasks

Task runtime bookkeeping MUST distinguish dispatch-owned pre-ready SkillRunner request ids from user-visible task projections. Pre-ready requests MAY remain in dispatch or ledger state, but they MUST NOT start observation loops as invisible tasks.

#### Scenario: upload-stalled request remains non-observing until ready

- **GIVEN** SkillRunner `/v1/jobs` has returned a `requestId`
- **AND** the upload step has not emitted `request-ready`
- **WHEN** task runtime or startup reconciliation restores local bookkeeping for that request
- **THEN** it MUST NOT create a hidden active task that is absent from the task list but still drives session sync
- **AND** it MUST NOT start event-session sync for that request before the ready boundary

#### Scenario: request-ready creates normal visible ownership

- **GIVEN** a SkillRunner request has emitted `request-ready`
- **WHEN** task runtime creates or restores the associated task projection
- **THEN** the projection MUST contain `backendId` and `requestId`
- **AND** subsequent observation and reconcile behavior MAY proceed through the bounded non-terminal cadence rules

### Requirement: SkillRunner non-terminal reconcile MUST back off when unchanged

Task runtime reconciliation MUST preserve visible SkillRunner non-terminal task rows while reducing request frequency for runs whose backend state remains unchanged.

#### Scenario: unchanged queued request uses bounded reconcile cadence

- **GIVEN** a SkillRunner task projection has `backendId` and `requestId`
- **AND** backend reconciliation repeatedly observes the same non-terminal `queued` state
- **WHEN** the reconciler schedules subsequent checks
- **THEN** it MUST increase or maintain a bounded per-request reconcile interval instead of polling on every global tick
- **AND** it MUST keep the task visible as non-terminal
- **AND** it MUST NOT delete active/history rows solely because the request is stuck queued

#### Scenario: state change resets reconcile cadence

- **GIVEN** a SkillRunner request is under a throttled non-terminal reconcile cadence
- **WHEN** reconciliation observes a changed state such as `running`, `waiting_user`, `waiting_auth`, `succeeded`, `failed`, or `canceled`
- **THEN** plugin MUST reset request-local cadence for the changed state
- **AND** terminal and waiting-state handling MUST proceed without waiting for the old queued backoff window

#### Scenario: backend-level failures keep existing health semantics

- **WHEN** reconciliation fails due to network error, timeout, `429`, or `5xx`
- **THEN** plugin MUST continue to use existing recoverable/backend health gating semantics
- **AND** unchanged-state backoff MUST NOT suppress backend health failure accounting

#### Scenario: throttled task remains cancelable when cancellation is available

- **WHEN** a SkillRunner task is throttled because it remains unchanged non-terminal
- **THEN** dashboard/workspace projections MUST retain enough `backendId` and `requestId` context for user actions such as opening the run or canceling it when those actions are otherwise available
