## ADDED Requirements

### Requirement: Terminal ACP Skills controls preserve terminal navigation

Assistant Workspace SHALL show Connect for an eligible detached terminal ACP
Skills run and enable the composer only after explicit connection. Prompting
SHALL show turn activity and Interrupt while the run remains in its completed or
failed navigation group.

#### Scenario: Connected succeeded run remains completed

- **GIVEN** a succeeded ACP Skills run is explicitly connected for conversation
- **WHEN** the user sends and settles a prompt
- **THEN** the run SHALL remain in the completed/history group
- **AND** the composer and activity controls SHALL reflect only conversation
  state without projecting an active workflow task.

### Requirement: Owner navigation explicitly projects archive availability

Every Assistant Workspace owner-navigation entry SHALL include a required
`canArchive` boolean supplied by its source. ACP Chat, ACP Skills, and
SkillRunner sources SHALL project the field explicitly.

#### Scenario: Busy terminal conversation cannot be archived

- **GIVEN** a terminal ACP Skills conversation is connecting, connected, or has
  an active prompt
- **WHEN** navigation actions are rendered
- **THEN** Archive SHALL remain visible but disabled with `canArchive=false`
- **AND** Disconnect SHALL be required before archive can become available.

#### Scenario: Detached terminal run can be archived

- **GIVEN** a terminal run is disconnected and has no active prompt
- **WHEN** navigation actions are rendered
- **THEN** its entry SHALL project `canArchive=true` subject to the source's
  existing archive rules.

### Requirement: Terminal transcript streaming preserves managed region identity

Terminal conversation transcript and loading updates SHALL be scoped to the
selected transcript owner and SHALL update only `TranscriptRegion`. Toolbar,
banner, plan, hint, reply, context drawer, details drawer, and permission drawer
SHALL remain isolated by their own visible-content signatures.

#### Scenario: Terminal stream updates transcript only

- **GIVEN** an eligible terminal ACP Skills conversation is selected and its
  non-transcript managed regions are mounted
- **WHEN** transcript chunks arrive without changing any region-owned visible
  state
- **THEN** transcript rows SHALL update
- **AND** every non-transcript managed region SHALL preserve DOM identity.
