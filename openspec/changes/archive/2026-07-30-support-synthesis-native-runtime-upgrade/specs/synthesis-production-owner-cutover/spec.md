## ADDED Requirements

### Requirement: First cutover evidence SHALL remain immutable across runtime upgrades

After native ownership is admitted, a compatible Rust runtime replacement
SHALL advance only runtime-admission state. It MUST NOT rewrite the first
cutover receipt, source backup basis, canonical manifest evidence, durable
summary, or ownership origin.

#### Scenario: Compatible native generation is promoted
- **WHEN** the pending generation completes durable activation
- **THEN** the first cutover receipt remains unchanged
- **AND** current runtime admission identifies the new generation

### Requirement: Admitted startup SHALL classify runtime identity before repair

Startup SHALL distinguish a matching admitted restart, a compatible build-only
upgrade, an incompatible runtime, and a recoverable pending generation before
entering production repair.

#### Scenario: Build fingerprint alone changes compatibly
- **WHEN** profile, target, protocol, schema, and capability identity remain equal
- **THEN** startup follows the native upgrade protocol instead of treating the first receipt as a permanent build pin

#### Scenario: Incompatible identity changes
- **WHEN** any compatibility identity other than build/bundle differs
- **THEN** startup remains fail closed and does not modify owner or admission state
