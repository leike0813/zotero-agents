## ADDED Requirements

### Requirement: ACP Skills interruption is confirmed by prompt settlement

ACP Skills SHALL keep the current prompt active after sending `session/cancel` and SHALL let the orchestrator exclusively own requested, confirmed, forced, and unconfirmed interruption transitions.

#### Scenario: Skill turn interruption is requested
- **WHEN** the user interrupts a live or recovered skill prompt
- **THEN** the run MUST retain its active prompt and running or repairing state
- **AND** Reply MUST remain disabled
- **AND** the interruption state MUST be `requested`.

#### Scenario: Skill turn cancellation is confirmed
- **WHEN** the original prompt returns `stopReason: "cancelled"`
- **THEN** the run MUST move to `waiting_user`
- **AND** the interruption state MUST be `confirmed`
- **AND** the adapter MUST remain available for continuation.

#### Scenario: Skill turn returns a non-cancelled result
- **WHEN** the original prompt returns a non-cancelled result after interruption was requested
- **THEN** the run MUST set the interruption state to `unconfirmed`
- **AND** it MUST process the real result through the existing convergence or failure path.

### Requirement: ACP Skills interruption has a recovery-aware force-stop

ACP Skills SHALL close the current run's adapter when the prompt remains unsettled for 10 seconds and SHALL base the post-close run state on negotiated recovery capabilities.

#### Scenario: Force-stopped run supports recovery
- **WHEN** interruption remains unconfirmed for 10 seconds
- **AND** the backend supports resume or load
- **THEN** the run MUST close its adapter and unregister its controller
- **AND** it MUST become `waiting_user` with recovery available
- **AND** the interruption state MUST be `forced`.

#### Scenario: Force-stopped run cannot recover
- **WHEN** interruption remains unconfirmed for 10 seconds
- **AND** the backend supports neither resume nor load
- **THEN** the run MUST close its adapter and unregister its controller
- **AND** it MUST become terminal with recovery unsupported
- **AND** Reply MUST remain unavailable.

#### Scenario: Old prompt settles after force-stop
- **WHEN** a force-stopped prompt later resolves or rejects
- **THEN** its stale outcome MUST NOT restore an active controller or overwrite the forced run state.

### Requirement: ACP Skills interruption events have one lifecycle owner

ACP Skills SHALL record each interrupt transition once from the orchestrator and SHALL NOT duplicate optimistic transitions in the run store.

#### Scenario: Interrupt lifecycle is audited
- **WHEN** a skill turn progresses through interruption request and completion
- **THEN** the run MUST record `interrupt-requested` once
- **AND** it MUST record exactly one of `interrupt-confirmed` or `interrupt-forced` when applicable.
