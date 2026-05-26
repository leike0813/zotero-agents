## ADDED Requirements

### Requirement: Git Sync actions surface queue state in Workbench

Workbench Git Sync controls SHALL reflect Git Sync queue and allowed-action state.

#### Scenario: A Git Sync action is in flight

- **WHEN** a Git Sync command such as sync, retry, pause, resume, or conflict
  resolution is in flight
- **THEN** the matching Workbench action SHALL be disabled
- **AND** repeated clicks SHALL NOT start duplicate Git Sync commands.

#### Scenario: Git Sync action is not allowed

- **WHEN** Git Sync state omits an action from its allowed actions
- **THEN** the Workbench SHALL NOT present that action as executable.
