## ADDED Requirements

### Requirement: ACP Skills transcript signal governance

ACP Skills SHALL project only high-signal runtime events into the conversation transcript.

#### Scenario: Permission request and result coalesce
- **GIVEN** an ACP Skills run receives a permission request
- **WHEN** the request is later approved, denied, or cancelled
- **THEN** the transcript SHALL contain one permission item for that request
- **AND** the item status SHALL update from `pending` to the final state.

#### Scenario: Low-signal success statuses stay out of transcript
- **GIVEN** an ACP Skills run records internal success events such as prompt finished or output validation succeeded
- **WHEN** the store projects transcript items
- **THEN** those events SHALL remain in logs only
- **AND** they SHALL NOT appear as transcript status items.
