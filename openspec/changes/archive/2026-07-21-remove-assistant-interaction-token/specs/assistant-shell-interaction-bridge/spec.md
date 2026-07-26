## MODIFIED Requirements

### Requirement: Waiting-user interactions use one bounded Assistant contract

The Assistant shell SHALL represent open text, single choice, confirmation, and file upload requests with one exact-key validated pending-interaction DTO. The DTO SHALL preserve JSON option values, limit options to 16 and file slots to 8, and reject oversized, malformed, or unknown nested wire data. It SHALL NOT introduce an interaction token when the backend protocol provides no such entity.

#### Scenario: Structured choice remains typed

- **WHEN** a waiting-user hint declares an option whose label differs from a boolean or object value
- **THEN** the child model SHALL retain the original JSON value as `responseValue`
- **AND** use the label only for visible display and transcript text

#### Scenario: Stale interaction action arrives

- **WHEN** an action's owner or waiting state no longer matches the current pending interaction
- **THEN** the host SHALL reject it without submitting a continuation

### Requirement: Shared reply DOM reads only current user input

The shared managed reply region MUST keep its textarea and action button stable across equivalent publications. Reply dispatch SHALL use the currently entered text and canonical selected owner without carrying a synthetic interaction identity.

#### Scenario: Sequential waiting turns reuse a stable reply mount

- **WHEN** the same owner enters two serialized waiting-user turns without a structural reply-state change
- **THEN** the textarea and reply button identities SHALL remain stable
- **AND** each dispatch SHALL send the current typed response to the current waiting owner
- **AND** no interaction token SHALL be emitted.
