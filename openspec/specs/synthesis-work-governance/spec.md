# synthesis-work-governance Specification

## Purpose
Synthesis runtime work is represented by explicit operation rows, not background queues.

## Requirements

### Requirement: Explicit operation is the only runtime work record
Synthesis runtime work SHALL be represented by explicit operation records created by a user action, workflow apply, protected import/export/reset, or scoped debug command.

#### Scenario: Operation is listed
- **WHEN** Workbench or Host Bridge lists Synthesis operations
- **THEN** the result SHALL contain explicit operations only
- **AND** it SHALL NOT include WorkItems, WorkRuns, dirty events, or queue aggregates.

### Requirement: Operations are not claimable worker queue items
Synthesis operation records SHALL NOT support owner-worker claiming, queue drain, pause/resume queue state, retry scheduling, or coalescing.

#### Scenario: Operation needs continuation
- **WHEN** an explicit operation cannot finish within its slice budget
- **THEN** it SHALL store progress and return a continuation status
- **AND** continuation SHALL require an explicit caller action or operation-specific controlled loop, not a global queue drain.

### Requirement: Public maintenance controllers SHALL have composition lifecycle ownership

Every accepted public maintenance controller SHALL be registered with the current native composition before its thread starts. Shutdown SHALL close controller admission, request cancellation, and drain registered controllers before storage close. Cancellation observed before promotion SHALL publish one durable canceled terminal and no later promotion.

#### Scenario: Shutdown races accepted maintenance work

- **WHEN** shutdown begins after a maintenance receipt is accepted but before promotion
- **THEN** the registered controller SHALL observe cancellation at its promotion boundary
- **AND** its receipt SHALL converge to one canceled or already-established terminal without a later unreported commit.

### Requirement: Public maintenance request replay SHALL reuse the first durable operation

The native runtime SHALL derive public maintenance operation identity from the stable request ID, capability, and canonical argument basis without using acceptance time. Only the request that first creates that identity SHALL start work or publish maintenance lifecycle events; an identical replay SHALL return the existing durable receipt in its current state.

#### Scenario: Accepted request is replayed

- **WHEN** the same request ID, capability, and canonical arguments are submitted again while the operation is pending, running, or terminal
- **THEN** the runtime SHALL return the original operation ID and persisted receipt
- **AND** it SHALL NOT start another worker, acquire another maintenance epoch, or repeat Host effects

#### Scenario: Caller submits a new request identity

- **WHEN** the caller submits the same capability and arguments with a different request ID
- **THEN** the runtime SHALL treat it as a distinct requested operation

### Requirement: Startup SHALL cancel stale Synthesis runtime operations

Synthesis startup reconciliation SHALL classify every persisted non-terminal operation before those rows are surfaced as active Workbench jobs. A public maintenance operation that was pending SHALL require explicit continuation. A public maintenance operation that was running SHALL fail with an unknown external-effect outcome rather than being reported as canceled or replayed. Other persisted running operation rows SHALL be canceled as stale. Ordinary progress, chrome, client, debug, and service-construction reads SHALL remain read-only and SHALL NOT classify operations based on elapsed timestamp age.

#### Scenario: Public maintenance operation was pending

- **GIVEN** a public maintenance receipt is persisted with status `pending`
- **WHEN** startup runtime work reconciliation runs
- **THEN** the receipt SHALL remain pending with phase `continuation_required`
- **AND** no maintenance work or Host effect SHALL start automatically

#### Scenario: Public maintenance operation was running

- **GIVEN** a public maintenance receipt is persisted with status `running`
- **WHEN** startup runtime work reconciliation runs
- **THEN** the receipt SHALL become failed with phase `restart_reconciliation_failed`
- **AND** its diagnostics SHALL report `restart_external_effect_unknown`

#### Scenario: Other running operation was left by the previous session

- **GIVEN** a non-public-maintenance Synthesis operation row is persisted with status `running`
- **WHEN** startup runtime work reconciliation runs
- **THEN** the operation SHALL be updated to `canceled`
- **AND** its diagnostics SHALL include `synthesis_operation_stale_after_restart`
- **AND** Workbench background jobs SHALL NOT count it as running

#### Scenario: Running operation is read during the current session

- **GIVEN** a Synthesis operation row remains `running` during the current session regardless of its timestamp age
- **WHEN** an ordinary progress, chrome, client, debug, or service-construction read executes
- **THEN** the operation SHALL remain `running`
- **AND** only explicit startup reconciliation SHALL classify persisted running state as a restart orphan

#### Scenario: Reconciliation exceeds one storage page

- **GIVEN** more non-terminal operations exist than one bounded repository page can return
- **WHEN** startup runtime work reconciliation runs
- **THEN** it SHALL classify every matching operation through stable pagination
- **AND** terminal operation rows SHALL remain unchanged

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
