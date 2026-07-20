## ADDED Requirements

### Requirement: Topic Graph TypeScript Worker parity SHALL survive Rust routing
Moving the private sidecar Topic Graph operation to Rust SHALL NOT remove or weaken the source and compiled TypeScript Worker canaries that guard environment-neutral engine resolution.

#### Scenario: Topic Graph canaries run after migration
- **WHEN** source and emitted Topic Graph Worker fixtures execute the same canonical request as the direct TypeScript engine
- **THEN** both rebuilt results SHALL remain equal
- **AND** no source-tree JavaScript shim SHALL exist.
