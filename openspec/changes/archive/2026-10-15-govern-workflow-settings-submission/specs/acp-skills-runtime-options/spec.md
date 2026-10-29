## ADDED Requirements

### Requirement: ACP complete catalog probes SHALL settle within one lifecycle budget

A complete catalog probe SHALL apply one total budget to setup, adapter launch, initialization, session reading and cleanup. Cancellation or deadline expiry SHALL prevent successful cache publication. Temporary adapters acquired after cancellation SHALL be closed through the existing controller cleanup path. Cleanup SHALL be bounded and SHALL preserve unrelated controllers.

#### Scenario: Cancel initialization or session reading
- **WHEN** the probe is canceled before its result is published
- **THEN** it SHALL settle as unsuccessful without publishing a replacement catalog
- **AND** its temporary adapter SHALL receive bounded cleanup.

#### Scenario: Adapter launch completes after expiry
- **WHEN** adapter launch resolves after the probe deadline
- **THEN** the late adapter SHALL be closed
- **AND** the probe SHALL not resume initialization or return success.

#### Scenario: Multiple phases consume the budget
- **WHEN** initialization and session reading together exceed the total probe budget
- **THEN** the second phase SHALL receive only the remaining budget
- **AND** a stalled close SHALL not keep the probe pending indefinitely.

### Requirement: Explicit disabled ACP permission approval SHALL remain a valid setting

ACP permission approval SHALL accept both boolean values through workflow settings and strict provider profile validation. Explicit false SHALL remain disabled through persistence and runtime projection, including when replacing an earlier true value.

#### Scenario: Disable a previously enabled approval
- **WHEN** the user unchecks ACP permission approval and saves or confirms
- **THEN** validation SHALL accept false
- **AND** the resulting execution SHALL require permission approval through the existing manual path.
