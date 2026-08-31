## ADDED Requirements

### Requirement: Public maintenance dispatch ownership SHALL be durable

Every public maintenance dispatch SHALL be authorized by one durable transition winner. A new submission and retry successor SHALL use their insert winner; continuation of an existing operation SHALL use the `continuation_required` to queued compare-and-set winner. Duplicate commands SHALL return the current durable operation view without publishing lifecycle events, starting another worker, acquiring another maintenance epoch, or repeating Host effects.

#### Scenario: New submission is replayed during dispatch
- **WHEN** concurrent callers submit the same stable public maintenance identity before its first worker reaches running
- **THEN** exactly one durable insert winner SHALL dispatch the operation
- **AND** every duplicate SHALL return the same operation ID and current view without dispatching

#### Scenario: Retry command is replayed
- **WHEN** concurrent retry commands use the same eligible predecessor operation and retry key
- **THEN** exactly one retry successor SHALL be created and dispatched
- **AND** every duplicate SHALL return that successor without dispatching it again

#### Scenario: Continuation command is replayed
- **WHEN** concurrent continue commands target one `continuation_required` operation
- **THEN** exactly one compare-and-set winner SHALL queue and dispatch that same operation
- **AND** every duplicate SHALL return the current operation without dispatching it again

### Requirement: Durable maintenance commit SHALL divide command errors from operation outcomes

Validation, catalog resolution, and persistence failures before durable acceptance MAY fail the command without creating an operation. Once a submission, retry successor, continue, or cancel transition commits durably, later dispatch, spawn, handler, panic, deadline, cancellation, and reconciliation failures SHALL be recorded against that same operation. A post-commit failure MUST NOT be reported as though the command was never accepted.

#### Scenario: Worker spawn fails after acceptance
- **WHEN** a public maintenance operation commits its durable acceptance and its worker cannot be spawned
- **THEN** that operation SHALL converge to one failed terminal receipt with a stable spawn-failure code
- **AND** replaying the command SHALL return that same operation rather than creating or dispatching another

#### Scenario: Terminal persistence is unavailable
- **WHEN** execution fails after durable acceptance and the runtime cannot persist or read the terminal receipt
- **THEN** the command or diagnostic result SHALL preserve the accepted operation ID and report durable-state uncertainty
- **AND** it SHALL NOT claim that no operation was accepted

### Requirement: Running public maintenance cancellation SHALL be cooperative

Canceling pending work SHALL terminalize it without dispatch. Canceling running work SHALL durably record `cancel_requested` and return immediately; the operation SHALL become canceled only when execution observes cancellation at a safe promotion checkpoint. Terminal state SHALL remain first-writer-wins, and cancellation SHALL NOT claim to roll back an effect that already passed its checkpoint.

#### Scenario: Running operation receives cancel
- **WHEN** a cancel command targets a running public maintenance operation
- **THEN** the returned operation view SHALL remain running with phase `cancel_requested`
- **AND** the worker SHALL converge to canceled only after observing the request at a safe checkpoint

#### Scenario: Completion wins the cancellation race
- **WHEN** an operation commits completion before its cancel request can commit a canceled terminal
- **THEN** the completed terminal SHALL remain authoritative
- **AND** the later cancellation SHALL return the current completed operation without overwriting it
