## ADDED Requirements

### Requirement: Session retirement SHALL have one owner

The supervisor SHALL revoke a retiring session's ready connection immediately and settle its failure once. Stop and failure paths SHALL share its bounded teardown. Asynchronous completions SHALL validate both generation and session ownership before changing current status, retry counts, connections, or timers.

#### Scenario: A retired session finishes draining stderr after replacement
- **WHEN** a health failure retires a session and its exit callback completes after a replacement starts
- **THEN** the replacement remains the supervised session
- **AND** the old callback consumes no retry budget and schedules no launch

#### Scenario: Concurrent health failures and process exit
- **WHEN** health observers and process exit report the same session's failure
- **THEN** the supervisor retires it once and schedules at most one replacement

#### Scenario: Stop supersedes startup or observation
- **WHEN** stop invalidates a generation while spawn, handshake, health, or teardown is pending
- **THEN** late completion cannot publish ready or schedule a restart
- **AND** any late-spawned process is stopped and only its own resources are cleaned

### Requirement: Health failure incidents SHALL retain a safe causal code

A health-triggered retirement SHALL persist the first specific normalized control failure code alongside its existing lifecycle reason. Subsequent exit callbacks SHALL NOT replace that cause. Unknown errors SHALL normalize to a generic safe code; raw error text, credentials, paths, and stacks SHALL NOT be persisted.

#### Scenario: Health times out and the process exits normally during teardown
- **WHEN** a health request times out and intentional shutdown produces exit code zero
- **THEN** the persisted lifecycle incident retains the control timeout cause
- **AND** normal exit does not become a second failure incident
