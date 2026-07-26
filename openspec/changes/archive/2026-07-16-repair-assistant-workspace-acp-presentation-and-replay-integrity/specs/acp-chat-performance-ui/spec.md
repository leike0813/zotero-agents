## ADDED Requirements

### Requirement: Chat presentation uses complete navigation data

ACP Chat navigation SHALL include the complete backend and session catalog,
session title, backend display name, status, time, message count, and error
semantics. Runtime/session id SHALL NOT substitute for conversation id.

#### Scenario: A historical session is selected

- **WHEN** the user selects it after a backend refresh
- **THEN** navigation, banner, drawer, and actions resolve the same canonical
  session owner
- **AND** its indexed transcript page is visible without a full snapshot.

### Requirement: Chat steady updates do not materialize legacy snapshots

Steady transcript, count, and progress changes SHALL perform zero frontend,
panel, or full-snapshot materialization.

#### Scenario: A streaming mutation arrives

- **WHEN** the selected Chat owner receives one transcript mutation
- **THEN** publication cost grows with that mutation
- **AND** it does not grow with accumulated transcript or page size.
