## ADDED Requirements

### Requirement: Process termination SHALL compete with discovery
The supervisor SHALL observe child termination while waiting for discovery. A child that exits before ready publication SHALL terminate that launch immediately with its stable startup code when available instead of waiting for discovery timeout.

#### Scenario: Unsupported repository exits before discovery
- **WHEN** the child reports `legacy_schema_variant_unsupported` and exits before publishing discovery
- **THEN** the launch terminates with that code without waiting for the discovery deadline
- **AND** the deterministic failure is not retried automatically

#### Scenario: Unknown child crash occurs
- **WHEN** the child exits without a recognized deterministic startup code
- **THEN** the supervisor applies the bounded retry policy
- **AND** opens the fuse after the configured attempt budget

### Requirement: Supervisor SHALL own startup terminal state
The supervisor SHALL be the single owner of startup deadline, retry, fuse, terminal publication, and explicit recovery. Once a generation becomes terminal it SHALL not launch more attempts.

#### Scenario: Startup deadline expires
- **WHEN** the startup deadline expires during an attempt
- **THEN** the supervisor terminates the generation once
- **AND** no production-owner timer or pending retry starts another child

