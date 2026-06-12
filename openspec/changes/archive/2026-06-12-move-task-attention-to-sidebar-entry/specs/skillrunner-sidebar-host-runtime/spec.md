## ADDED Requirements

### Requirement: Assistant Sidebar entry task attention
The Assistant Sidebar entry SHALL be the persistent UI surface for backend tasks that need user attention.

#### Scenario: Badge counts only human-attention tasks
- **GIVEN** active SkillRunner workflow tasks and ACP Skill runs exist
- **WHEN** only some are `waiting_user`, `waiting_auth`, or pending permission
- **THEN** the Assistant Sidebar entry badge SHALL count only those human-attention tasks
- **AND** ordinary running tasks SHALL NOT increase the badge count.

#### Scenario: Sidebar entry hosts active task popover
- **GIVEN** the Assistant Sidebar entry is mounted
- **WHEN** the user hovers the entry
- **THEN** the existing active task popover SHALL open from that entry
- **AND** the popover SHALL continue to list active task rows from the Dashboard active task read model.

#### Scenario: Workbench sidebar entry mirrors task attention
- **GIVEN** the user is in the Workbench tab and the Zotero library toolbar is not visible
- **WHEN** active tasks enter or leave `waiting_user`, `waiting_auth`, or pending permission
- **THEN** the Workbench header sidebar button SHALL update its attention badge from the same human-attention count as the toolbar sidebar button
- **AND** hovering the Workbench header sidebar button SHALL open the existing active task popover.

#### Scenario: Workbench button does not own task affordances
- **GIVEN** the Workbench toolbar button is mounted
- **WHEN** active or waiting tasks exist
- **THEN** the Workbench button SHALL NOT host the active task popover
- **AND** it SHALL NOT mirror the Assistant Sidebar attention badge.

#### Scenario: Side-pane buttons do not own task affordances
- **GIVEN** the Assistant side-pane buttons are mounted inside Zotero item or reader panes
- **WHEN** active or waiting tasks exist
- **THEN** those side-pane buttons SHALL NOT host the active task popover
- **AND** they SHALL NOT draw task attention badges.
