## ADDED Requirements

### Requirement: Native routing SHALL decode by capability before domain dispatch

The native dispatcher and reverse-Host client SHALL select a capability-specific strict DTO before calling application or Host code. Raw JSON MAY exist only inside bounded transport decoding and MUST NOT cross into domain ports.

#### Scenario: Required nested field is absent
- **WHEN** a production or reverse-Host payload omits a required nested field
- **THEN** routing returns the stable invalid-contract failure before domain dispatch
- **AND** no fabricated default state is observed

#### Scenario: Valid capability payload is dispatched
- **WHEN** a payload satisfies the exact recursive contract for its capability
- **THEN** the typed application or Host handler receives the corresponding concrete DTO
- **AND** its result is serialized from the mapped concrete result type

