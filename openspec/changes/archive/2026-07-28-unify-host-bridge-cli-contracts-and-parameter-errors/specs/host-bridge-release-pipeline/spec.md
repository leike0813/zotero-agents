## ADDED Requirements

### Requirement: CLI build identity SHALL include executable contract inputs
The CLI build fingerprint SHALL include the exact canonical capability and command contract bytes embedded by Rust and SHALL exclude materialized Agent Surface output that the binary no longer consumes.

#### Scenario: Executable contract changes
- **WHEN** either canonical runtime contract changes
- **THEN** the CLI build fingerprint SHALL change and a new complete prebuild set SHALL be required before publication.

#### Scenario: Only a generated command card changes
- **WHEN** materialized Agent Surface content changes without a parser or executable contract change
- **THEN** the CLI build fingerprint SHALL remain unchanged
- **AND** content validation SHALL still require the derivative to match its source.

### Requirement: Publication SHALL reject contract or derivative drift
PR and release gates SHALL validate canonical contract structure, handler and command coverage, runtime descriptor parity, and materialized surface parity.

#### Scenario: Source changes without its derivative
- **WHEN** parser or executable contract source changes without regenerated command content
- **THEN** publication SHALL fail before any immutable or mutable Host Bridge surface advances.
