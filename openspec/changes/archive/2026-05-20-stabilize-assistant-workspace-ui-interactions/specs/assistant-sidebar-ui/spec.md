# assistant-sidebar-ui

## ADDED Requirements

### Requirement: Assistant drawers remain interactive during live updates

Assistant drawer task lists SHALL preserve interactive DOM state while live
task metadata changes.

#### Scenario: Running task timestamp updates while drawer is open

- **WHEN** an assistant drawer is open
- **AND** a running task only changes update metadata such as `updatedAt`
- **THEN** the drawer SHALL remain open and interactive
- **AND** the renderer SHALL NOT replace the whole drawer subtree.

### Requirement: ACP Skills composer reflects running and waiting states

ACP Skills composer controls SHALL use deterministic running and waiting state
semantics.

#### Scenario: Reconnected run is working again

- **WHEN** an ACP Skills run is reconnected and enters a running state
- **THEN** the reply textarea SHALL be disabled
- **AND** the primary composer button SHALL remain enabled as an interrupt or
  cancel action.

#### Scenario: ACP Skills run waits for user input

- **WHEN** an ACP Skills run is waiting for user input with an available
  conversation and no pending permission request
- **THEN** the reply textarea SHALL be enabled
- **AND** the primary composer button SHALL send the reply.

### Requirement: Unified workspace preserves open assistant sidebar intent

Opening the unified workspace SHALL preserve an already-open assistant sidebar.

#### Scenario: Workspace opens while assistant sidebar is already open

- **WHEN** the assistant sidebar is open
- **AND** the user opens the unified workspace
- **THEN** the workspace tab SHALL open
- **AND** the assistant sidebar SHALL be opened again for the selected Zotero
  pane.

### Requirement: Dashboard running task entries open selected ACP Skills runs

Dashboard running-task entries SHALL route ACP Skills tasks to the unified
assistant sidebar.

#### Scenario: User opens an active ACP Skills task

- **WHEN** the user clicks an ACP Skills running task from Dashboard
- **THEN** the assistant sidebar SHALL open on the ACP Skills tab
- **AND** the target request id SHALL be selected.
