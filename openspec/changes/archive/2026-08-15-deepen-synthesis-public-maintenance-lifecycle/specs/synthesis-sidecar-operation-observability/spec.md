## ADDED Requirements

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
