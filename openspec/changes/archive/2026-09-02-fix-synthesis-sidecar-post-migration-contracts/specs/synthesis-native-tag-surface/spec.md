## ADDED Requirements

### Requirement: Public staged-tag promotion SHALL support the public selection bound
The native Tag surface SHALL accept a valid staged-tag selection up to the existing public protocol bound. Internal effect batching MAY remain smaller, but batching SHALL be transparent to the public operation and SHALL preserve one basis-checked logical mutation.

#### Scenario: More than one hundred staged suggestions are selected
- **WHEN** a valid request selects 264 staged suggestions under one current vocabulary and staged revision
- **THEN** the operation promotes all eligible selections or reports the existing conflict/engine result
- **AND** it does not fail solely because the selection exceeds an internal effect batch size.

#### Scenario: A selection exceeds the public bound
- **WHEN** a request exceeds the existing public maximum
- **THEN** the public request validator rejects it before application mutation
- **AND** no vocabulary or staged state changes.
