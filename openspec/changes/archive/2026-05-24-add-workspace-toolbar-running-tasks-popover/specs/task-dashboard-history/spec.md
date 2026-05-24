## ADDED Requirements

### Requirement: Workspace toolbar shows active task popover

The Workspace toolbar button SHALL expose a lightweight hover/focus popover that
summarizes current active tasks.

The popover SHALL use the same active-task visibility rules as the Dashboard
running task list. It SHALL NOT use a separate task source or duplicate stale
ACP task filtering logic.

The toolbar button click behavior SHALL continue to open the Zotero Skills
Workspace.

#### Scenario: User hovers Workspace button

- **WHEN** the user hovers or focuses the Workspace toolbar button
- **THEN** a compact running task popover SHALL appear after a short delay
- **AND** it SHALL list current active visible tasks or an empty state.

#### Scenario: User clicks Workspace button

- **WHEN** the user clicks the Workspace toolbar button itself
- **THEN** the Zotero Skills Workspace SHALL open as before.

#### Scenario: User clicks a task row

- **WHEN** the user clicks an ACP skill run task row in the popover
- **THEN** the unified Assistant Workspace SHALL open on the ACP Skills tab
- **AND** the corresponding run SHALL be selected.

- **WHEN** the user clicks a SkillRunner task row in the popover
- **THEN** the unified Assistant Workspace SHALL open on the SkillRunner tab
- **AND** the corresponding request SHALL be focused.

#### Scenario: Popover omits footer actions

- **WHEN** the running task popover is shown
- **THEN** it SHALL NOT include a footer button such as `View all` or
  `Open Dashboard`.
