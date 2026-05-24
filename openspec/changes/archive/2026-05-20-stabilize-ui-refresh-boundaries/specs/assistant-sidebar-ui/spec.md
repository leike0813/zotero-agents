# assistant-sidebar-ui

## ADDED Requirements

### Requirement: Assistant live refreshes preserve active reply controls

The shared assistant panel renderer SHALL preserve active reply-control DOM
state when a snapshot changes unrelated panel data.

#### Scenario: Unrelated snapshot keeps focused textarea

- **WHEN** a managed assistant reply textarea is focused
- **AND** a subsequent snapshot keeps the same reply context and control shape
- **THEN** the renderer SHALL keep the same textarea DOM node
- **AND** it SHALL preserve the user's current value and selection.

#### Scenario: Existing composer semantics remain unchanged

- **WHEN** the reply model represents enabled text reply, choice buttons,
  permission actions, or busy interrupt state
- **THEN** the renderer SHALL preserve the existing enabled/disabled and action
  semantics for that state
- **AND** it SHALL NOT trade a valid button interaction for a disabled text box.

### Requirement: Assistant refresh changes require behavior baselines

Changes to shared assistant UI refresh logic SHALL be protected by tests for
existing user-visible behavior.

#### Scenario: Refresh hardening keeps drawer behavior

- **WHEN** the drawer is open and live task metadata refreshes
- **THEN** open/close, row selection, item actions, and section toggles SHALL
  behave as before
- **AND** the drawer SHALL NOT be rebuilt for metadata-only changes.
