## ADDED Requirements

### Requirement: Workbench review queues use single detailed review cards

Synthesis Workbench SHALL render domain-local human review requests as a single
detailed review card instead of persistent multi-row review lists.

#### Scenario: A domain has no review requests

- **WHEN** a Workbench domain has no open review request
- **THEN** the review panel SHALL NOT be rendered for that domain
- **AND** the main content layout SHALL NOT reserve space for an empty review
  queue.

#### Scenario: A domain has multiple review requests

- **WHEN** a Workbench domain has multiple open review requests
- **THEN** the UI SHALL render only the first current review request
- **AND** the card SHALL include enough detail to decide: reason, impact,
  evidence, candidate, conflict, or diagnostics information as applicable.

#### Scenario: A review decision is submitted

- **WHEN** the user submits a review decision
- **THEN** the button SHALL use existing async pending feedback
- **AND** duplicate scoped submissions SHALL remain single-flight
- **AND** the next snapshot SHALL determine whether the next review card is
  shown or the panel closes.

#### Scenario: Tag import is idle

- **WHEN** no tag import draft or preview is open
- **THEN** the Tags tab SHALL show an Import Tags entry point
- **AND** it SHALL NOT render the import textarea by default.

#### Scenario: Motion is reduced

- **WHEN** the user prefers reduced motion
- **THEN** review panel animations SHALL be disabled.
