## ADDED Requirements

### Requirement: POSIX process-group actuation SHALL preserve the authorized target
Runtime process control SHALL represent a launch-owned process group as a validated target and SHALL preserve its complete PGID through signal delivery. External command delivery MUST place an explicit option terminator before the negative PGID operand and MUST fail closed when safe delivery is unavailable or unsuccessful.

#### Scenario: Mozilla delivers a validated group signal
- **WHEN** ownership validation authorizes PGID `1743624` for TERM
- **THEN** the signal utility SHALL receive `-s`, `TERM`, `--`, and `-1743624` as distinct arguments
- **AND** the delivered operand SHALL retain the complete authorized PGID

#### Scenario: Safe group delivery fails
- **WHEN** the signal utility is unavailable, rejects the invocation, or exits unsuccessfully
- **THEN** process control SHALL reject group actuation
- **AND** it MUST NOT retry with an operand form that omits the option terminator

#### Scenario: Node delivers a validated group signal
- **WHEN** the Node transport escalates a validated process group
- **THEN** it SHALL pass the complete validated PGID through the direct process signal API
- **AND** it MUST NOT accept an arbitrary unvalidated numeric target
