## MODIFIED Requirements

### Requirement: Debug Dashboard SHALL present actionable correlated event detail

The debug-only Synthesis Sidecar Dashboard SHALL render lifecycle and operation statuses with the shared semantic status badge system. A selected event SHALL expose a compact structured summary and the complete selected/related JSON payload, and JSON copy SHALL provide visible success or failure feedback.

#### Scenario: Event timeline is displayed

- **WHEN** started, succeeded, and failed events are present
- **THEN** their statuses use accent, success, and error badge tones respectively
- **AND** the selected event summary exposes only available identifiers and capacity fields

#### Scenario: JSON copy succeeds

- **WHEN** the user copies selected and related event JSON
- **THEN** the button temporarily reports success
- **AND** the existing Dashboard toast confirms the copy

#### Scenario: JSON copy fails

- **WHEN** the clipboard operation rejects
- **THEN** the button reports failure
- **AND** the Dashboard presents a failure toast

#### Scenario: Production build is created

- **WHEN** debug diagnostics are compile-time disabled
- **THEN** the Sidecar Dashboard renderer, status projection, detail construction, and copy handler remain absent from the production artifact
