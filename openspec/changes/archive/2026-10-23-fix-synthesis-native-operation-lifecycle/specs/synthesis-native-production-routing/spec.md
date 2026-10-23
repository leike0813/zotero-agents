# Spec Delta

## ADDED Requirements

### Requirement: Native capability phases SHALL share one transport budget

Each native capability invocation SHALL start its manifest-owned transport budget before connection recovery and input preparation. Preparation, staging, business RPC, and output download SHALL consume that same absolute budget. Every next network phase MUST use only the remaining window and MUST NOT dispatch after cancellation or expiry. Existing manifest deadlines and transport grace remain unchanged.

#### Scenario: Input staging exhausts the budget
- **WHEN** input preparation or staging consumes the capability's transport budget
- **THEN** the client reports timeout with `request_timeout` without dispatching the next page, seal, or business RPC

#### Scenario: Input staging consumes part of the budget
- **WHEN** staging succeeds before the total budget expires
- **THEN** business RPC and output reads receive only the remaining window rather than a fresh full deadline

#### Scenario: Output reading exhausts the budget
- **WHEN** an output page finishes after the invocation budget expires
- **THEN** no subsequent page or successful public result is published

#### Scenario: Synchronous preparation crosses the deadline
- **WHEN** synchronous DTO rebuilding, serialization, or chunking crosses the budget
- **THEN** the next network effect is rejected as timeout

### Requirement: Native transfer cleanup SHALL have an independent local bound

Known native input and output transfer sessions SHALL be cleaned up using independent 1000 ms local bounds, without the canceled business signal or exhausted business deadline. Cleanup failure MUST NOT replace a primary business failure. Output consumers explicitly retaining a session SHALL preserve that behavior. Disposal SHALL await local cleanup, not remote cleanup confirmation beyond the bound.

#### Scenario: Cancellation follows session creation
- **WHEN** a known input session is interrupted during staging or a later business phase
- **THEN** it is canceled once under an independent cleanup window

#### Scenario: Output validation and cleanup both fail
- **WHEN** an output manifest, page, content hash, or JSON result is invalid and session cancellation also fails
- **THEN** the validation failure remains the primary result

#### Scenario: Transfer creation has no known identity
- **WHEN** local waiting ends after begin was sent but before a session ID is received
- **THEN** no session identity or confirmed server cleanup is fabricated
- **AND** existing server reaping remains responsible for any unknown session

#### Scenario: Output session is retained by its owner
- **WHEN** a reverse-Host output consumer requests session retention
- **THEN** consumption does not cancel that session

### Requirement: Local native cancellation SHALL NOT control durable maintenance work

Composition invalidation and disposal SHALL stop local waiting without sending durable maintenance cancellation, rewriting a remote terminal, retrying work, or changing accepted operation identity. The short control RPC transport budget and the manifest-owned independently persisted durable work deadline SHALL remain distinct.

#### Scenario: An accepted operation outlives its native composition
- **WHEN** a native composition receives a maintenance receipt and is then disposed
- **THEN** a replacement composition can query the same operation ID while work remains pending or running and later observe completion
- **AND** maintenance-started and maintenance-terminal are each published once without implicit cancel or retry

#### Scenario: A control wait ends before durable work completes
- **WHEN** a local control RPC is canceled or reaches its transport deadline after durable acceptance
- **THEN** the local failure does not classify, cancel, or extend the independently owned durable work
