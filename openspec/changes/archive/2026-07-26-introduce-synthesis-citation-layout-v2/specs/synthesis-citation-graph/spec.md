## ADDED Requirements

### Requirement: Citation Graph layout state SHALL distinguish legacy and current layout versions

The Citation Graph projection SHALL read legacy layout identities for stale rendering and SHALL treat only layout version 2 with a Rust v2 engine identity as current.

#### Scenario: Legacy layout is projected

- **WHEN** persisted layout metadata identifies d3-force, radial, or components version 1.2
- **THEN** the layout SHALL remain readable as stale cache state
- **AND** it SHALL NOT be mistaken for a current v2 result.

#### Scenario: Current layout is projected

- **WHEN** persisted layout metadata identifies version 2 and a supported Rust engine
- **THEN** the layout SHALL be eligible for current-basis rendering and normal promotion checks.
