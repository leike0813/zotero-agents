# synthesis-tab-ui

## ADDED Requirements

### Requirement: Synthesis Workbench refresh preserves active controls

The Synthesis Workbench SHALL preserve active search, filter, and scroll state
when host snapshots refresh existing views.

#### Scenario: Snapshot refresh keeps search input

- **WHEN** the user is typing in a Workbench search or filter field
- **AND** the host sends a snapshot that does not change the active view
- **THEN** the input DOM node and current value SHALL be preserved
- **AND** Workbench actions such as refresh, open, copy, delete, and create
  topic SHALL keep their existing semantics.

#### Scenario: Snapshot refresh keeps scroll position

- **WHEN** the user has scrolled a Workbench list or detail region
- **AND** the host sends a snapshot for the same active view
- **THEN** the region's scroll position SHALL be preserved unless the user
  explicitly navigates to a different view or item.
