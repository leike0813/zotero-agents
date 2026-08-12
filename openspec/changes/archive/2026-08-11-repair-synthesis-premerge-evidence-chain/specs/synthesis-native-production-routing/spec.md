## ADDED Requirements

### Requirement: Production routing SHALL preserve security and contract-error precedence

After bounded transport reading, the production service SHALL authenticate the caller before returning capability-specific recursive validation details. Envelope and lifecycle authorization SHALL precede domain dispatch. Invalid request DTOs SHALL produce `invalid_request`; an invalid value returned by a capability implementation SHALL produce `internal`.

#### Scenario: Unauthenticated capability payload is invalid
- **WHEN** an unauthenticated caller submits a bounded payload whose capability DTO is invalid
- **THEN** the service rejects authentication before reporting the capability validation error
- **AND** no domain handler runs

#### Scenario: Capability returns a non-JSON-safe result
- **WHEN** an authenticated capability returns an unsupported value, undefined member, or cycle
- **THEN** the boundary returns the stable `internal` error
- **AND** it does not coerce or silently remove the invalid value
