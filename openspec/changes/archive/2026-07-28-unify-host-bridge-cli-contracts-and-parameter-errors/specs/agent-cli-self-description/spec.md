## ADDED Requirements

### Requirement: Published CLI surfaces SHALL be direct projections of runtime authorities
The CLI descriptor SHALL be built from the real Clap command tree and executable capability and command contracts. Runtime surface commands and the offline renderer SHALL use the same Rust descriptor builder.

#### Scenario: Parser or contract changes without rendered output
- **WHEN** a public argument, binding, target, input Schema, result Schema, or recovery rule changes
- **THEN** the runtime descriptor SHALL reflect the change immediately
- **AND** content and publication checks SHALL fail until tracked derivatives match.

#### Scenario: Command contract references an unknown parser argument
- **WHEN** a binding or structured-input declaration names an argument absent from the canonical Clap leaf
- **THEN** descriptor and command-contract validation SHALL fail.
