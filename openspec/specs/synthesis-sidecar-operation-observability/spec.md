# synthesis-sidecar-operation-observability Specification

## Purpose
TBD - created by syncing change govern-synthesis-sidecar-observability. Update Purpose after archive.

## Requirements

### Requirement: Host SHALL own business operation audit

The Host SHALL emit mutation start and invocation-terminal records and
read/periodic failure records from the production operation manifest. One
invocation SHALL own at most one failure incident regardless of nested boundary
failures. For a manifest operation whose receipt is
`public-maintenance-operation`, the invocation terminal SHALL classify the
public maintenance lifecycle envelope: `pending`, `running`, and `completed`
are accepted, while failed, canceled, timed-out, missing, malformed, or unknown
lifecycle states are non-success. Domain promotion and failure statuses belong
to the durable operation terminal and MUST NOT be applied to the initial
receipt envelope.

#### Scenario: Mutation fails in a worker
- **WHEN** a mutation starts and a nested worker failure reaches the Host
- **THEN** Runtime Log contains its start and one failed terminal incident
- **AND** no transport or worker failure is persisted separately

#### Scenario: Inline status-bearing operation is not successful
- **WHEN** transport succeeds for an inline operation but a declared semantic status is not accepted
- **THEN** the mutation invocation terminal is failed with the public semantic status

#### Scenario: Long mutation is accepted
- **WHEN** a public-maintenance-operation command returns `pending` or `running`
- **THEN** the Host invocation terminal and root trace are successful with that lifecycle status
- **AND** no `semantic_non_success` incident is created before the durable operation reaches a terminal

#### Scenario: Accepted work reaches a business terminal
- **WHEN** an accepted public maintenance operation later completes or fails
- **THEN** its operation query and terminal receipt remain authoritative for the business outcome
- **AND** statuses inside that terminal receipt are not reinterpreted as the initial invocation result

#### Scenario: Accepted work outlives its command RPC
- **WHEN** a public maintenance command returns before its accepted work reaches a terminal
- **THEN** the originating trace remains active and retains accepted, running, and exactly one terminal lifecycle event carrying the public operation ID and capability
- **AND** polling traces cannot evict the originating trace before that terminal

#### Scenario: Worker-backed maintenance fails
- **WHEN** an accepted maintenance worker times out, crashes, or returns an unsuccessful domain status
- **THEN** the durable terminal and terminal trace preserve the first stable raw failure code
- **AND** Workbench reports that code together with the public operation ID

### Requirement: Maintenance lifecycle observation SHALL follow durable transition ownership

`maintenance-started` SHALL mean that a durable operation first obtained execution ownership. It SHALL be published once by the new operation's insert winner. A retry successor is a new operation and SHALL publish its own started event; continuation of the same operation MUST NOT republish started. Every durable terminal transition SHALL publish exactly one `maintenance-terminal` from its commit winner, including cancellation, timeout, reconciliation, panic, and post-accept dispatch failure.

#### Scenario: Accepted operation is replayed
- **WHEN** an accepted operation is returned to a duplicate caller
- **THEN** no additional started, running, or terminal event SHALL be inferred from the returned receipt

#### Scenario: Continued operation reaches terminal in another trace
- **WHEN** a continuation command runs under a later trace and terminalizes the original operation
- **THEN** the terminal event SHALL carry the original operation identity
- **AND** the original accepted trace SHALL become unpinned without requiring its trace identity to be persisted in the operation record

#### Scenario: Checkpoint terminalizes canceled or timed-out work
- **WHEN** a promotion checkpoint commits a canceled or timed-out terminal
- **THEN** the commit winner SHALL publish one terminal event whose status and outcome agree with the durable operation view
- **AND** a late handler completion SHALL publish no replacement terminal

### Requirement: Host adapters SHALL NOT infer maintenance lifecycle events from receipts

Host transport and wire adapters SHALL treat lifecycle events from the native runtime as the observation source of truth. They MUST NOT synthesize started, running, or terminal events merely because a command response contains a pending, running, or terminal operation view.

#### Scenario: Initial command returns an accepted view
- **WHEN** a Host adapter receives a pending or running public maintenance view
- **THEN** it SHALL classify the invocation envelope according to the production manifest
- **AND** it SHALL NOT append a lifecycle started event from that view

### Requirement: Accepted layout work SHALL converge after runtime faults

Citation Graph layout SHALL use its declared worker-phase deadline and SHALL publish one terminal after worker timeout, worker panic, parent dispatch panic, cancellation, or finalization failure. A failed attempt MUST preserve the prior ready layout, release compute admission, and allow a later unrelated operation to proceed.

#### Scenario: Layout worker exceeds its phase deadline
- **WHEN** a Citation Graph layout worker exceeds 90 seconds inside the 120-second maintenance budget
- **THEN** the operation becomes timed out without promoting coordinates
- **AND** the worker and compute admission are replaced or released before the next operation

#### Scenario: Detached maintenance dispatch panics
- **WHEN** a detached maintenance controller panics or cannot persist its first terminal
- **THEN** bounded reconciliation exposes a stable failed or timed-out terminal
- **AND** the receipt does not remain running indefinitely

### Requirement: Completed trace summaries SHALL reflect correlated durable failure

A completed trace summary SHALL derive its displayed outcome from the complete correlated trace. A failed durable maintenance terminal SHALL make the trace summary failed even when the initial asynchronous command invocation succeeded with a pending lifecycle status.

#### Scenario: Accepted maintenance work later fails
- **WHEN** a trace contains a successful pending root invocation and a later failed maintenance terminal for the accepted operation
- **THEN** the trace summary SHALL display a failed outcome
- **AND** the root invocation event SHALL remain successful with its original pending lifecycle status.
