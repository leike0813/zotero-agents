## ADDED Requirements

### Requirement: Assistant Sidebar Panels SHALL Share Stable Composer Semantics

The shared assistant panel renderer MUST render normal send state and busy interrupt state consistently across ACP Chat, ACP Skills, and SkillRunner panels.

#### Scenario: Normal composer is ready to send

- **WHEN** a panel reply model is enabled and not busy
- **THEN** the text input SHALL be enabled
- **AND** the submit button SHALL use primary styling and send semantics.

#### Scenario: Busy composer interrupts without accepting text

- **WHEN** a panel reply model represents an active agent turn
- **THEN** the text input SHALL be disabled
- **AND** the button SHALL remain enabled with danger styling
- **AND** clicking the button SHALL emit the configured interrupt action.

### Requirement: Assistant Sidebar Drawers SHALL Only Close On Outside Clicks

Drawer overlays MUST close when the user clicks outside the drawer panel, and MUST remain open for interactions inside the drawer panel.

#### Scenario: User toggles completed section

- **WHEN** the user clicks the completed-section toggle inside the task drawer
- **THEN** the drawer SHALL remain open
- **AND** only the section collapsed state SHALL change.

#### Scenario: User clicks outside drawer

- **WHEN** the user clicks the drawer overlay outside the drawer panel
- **THEN** the drawer SHALL close.

### Requirement: Assistant Workspace SHALL Provide A Close Button

The Assistant workspace sidebar shell MUST expose a close button in the visible top bar.

#### Scenario: User closes sidebar from panel header

- **WHEN** the user clicks the Assistant workspace close button
- **THEN** the active sidebar panel SHALL close
- **AND** Zotero's native item or reader pane SHALL remain available.
