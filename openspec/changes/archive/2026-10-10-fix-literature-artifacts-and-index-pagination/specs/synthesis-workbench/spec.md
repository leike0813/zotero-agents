## MODIFIED Requirements

### Requirement: Index SHALL publish bounded progressive pages

Index SHALL publish the first 25-item source batch before subsequent batches and fill each displayed window to at most 100 parents. Previous/next windows SHALL provide complete source traversal. Continuations SHALL bind Host and Reference bases, reject changed bases and preserve order. Each batch SHALL read readiness only for its displayed source refs.

#### Scenario: Cold Index opens
- **WHEN** the first batch succeeds while a later batch is pending
- **THEN** the first rows are visible and interactive
- **AND** subsequent batches append without resetting the scroll position.

#### Scenario: A referenced batch has no matching rows
- **WHEN** a source batch yields no referenced rows but has a continuation
- **THEN** loading continues without treating the empty batch as completion.

#### Scenario: Basis changes during continuation
- **WHEN** Host or Reference facts change between batches
- **THEN** the changed page is rejected rather than mixed with the existing basis
- **AND** previously loaded content remains available with an error indication.

#### Scenario: More than one window exists
- **WHEN** 274 library sources are available
- **THEN** the user SHALL be able to traverse windows of 100, 100 and 74 parents without duplication or omission
- **AND** filling a window SHALL NOT mark the source exhausted.
