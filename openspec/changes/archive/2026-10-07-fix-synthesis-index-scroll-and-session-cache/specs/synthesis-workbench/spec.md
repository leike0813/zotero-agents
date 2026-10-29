## ADDED Requirements

### Requirement: Index SHALL publish bounded progressive pages

Index SHALL publish the first 25-item source batch before reading subsequent batches and incrementally fill at most 100 displayed rows. Continuations SHALL bind Host and Reference bases, reject changed bases, and preserve source order. Each batch SHALL read readiness only for its displayed source refs.

#### Scenario: Cold Index opens
- **WHEN** the first batch succeeds while a later batch is pending
- **THEN** the first rows are visible and interactive
- **AND** subsequent batches append without resetting the scroll position

#### Scenario: A referenced batch has no matching rows
- **WHEN** a source batch yields no referenced rows but has a continuation
- **THEN** loading continues without treating the empty batch as completion

#### Scenario: Basis changes during continuation
- **WHEN** Host or Reference facts change between batches
- **THEN** the changed page is rejected rather than mixed with the existing basis
- **AND** the previously loaded content remains available with an error indication

### Requirement: Index reference details SHALL read only requested sources

Explicit Index details SHALL read Reference rows for the specified source refs without enumerating the library or reevaluating readiness for the complete Index. Unchanged loaded details and zero-reference rows SHALL not trigger repeat reads.

#### Scenario: One row is expanded
- **WHEN** a user expands an unhydrated row with references
- **THEN** only the requested source is read
- **AND** its reference details are merged without replacing other rows or their readiness
