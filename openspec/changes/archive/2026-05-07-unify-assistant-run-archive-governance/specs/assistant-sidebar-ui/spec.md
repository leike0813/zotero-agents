# assistant-sidebar-ui Delta

## ADDED Requirements

### Requirement: Managed drawer run lifecycle actions

Assistant managed context drawers SHALL support item-level actions rendered separately from item selection.

ACP Chat conversation items, ACP Skills terminal run items, and SkillRunner terminal run items SHALL expose an Archive item action in their drawers.

Archive item actions SHALL use a briefcase icon and SHALL expose `归档` or `Archive` through tooltip and accessible label text.

Archive item actions SHALL NOT trigger the drawer item selection action.

#### Scenario: Archive action does not select the item

- **Given** a managed drawer item has both a selection action and an archive item action
- **When** the user clicks the archive action
- **Then** the archive action is emitted
- **And** the selection action is not emitted.

### Requirement: Runs drawer wording and cancel availability

ACP Skills and SkillRunner SHALL present their user-visible context drawer as `Runs`.

ACP Skills and SkillRunner SHALL expose `Cancel Run` only for non-terminal selected runs.

Terminal ACP Skills and SkillRunner runs SHALL be archived through drawer item archive actions, not through `Cancel Run`.

#### Scenario: Non-terminal run can be canceled

- **Given** the selected ACP Skills or SkillRunner run is non-terminal
- **When** the banner context actions are rendered
- **Then** `Cancel Run` is enabled
- **And** the drawer item does not expose Archive.

#### Scenario: Terminal run can be archived

- **Given** an ACP Skills or SkillRunner drawer item represents a terminal run
- **When** the drawer item is rendered
- **Then** the item exposes Archive
- **And** `Cancel Run` is not enabled for that selected run.
