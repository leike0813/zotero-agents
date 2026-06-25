## ADDED Requirements

### Requirement: Backend type values MUST be governed before provider resolution

The system MUST treat backend type as a closed runtime contract whose valid values are `skillrunner`, `acp`, `generic-http`, and `pass-through`.

#### Scenario: Valid backend type is loaded

- **WHEN** backend registry normalization reads a backend entry whose `type` is one of the governed backend type values
- **THEN** the normalized backend SHALL preserve that type as the provider dispatch backend type
- **AND** provider resolution SHALL continue to use `requestKind + backend.type`.

#### Scenario: Unknown backend type is rejected

- **WHEN** backend registry normalization reads a backend entry whose `type` is not one of the governed backend type values
- **THEN** the entry SHALL be reported as an invalid backend
- **AND** the entry SHALL NOT be returned by backend listing or provider resolution APIs.

#### Scenario: Invalid backend type does not make registry fatal

- **WHEN** at least one backend entry has an unknown type and at least one other backend entry is valid
- **THEN** backend registry loading SHALL return the valid backend entries
- **AND** the unknown-type backend SHALL be available through invalid-backend diagnostics.
