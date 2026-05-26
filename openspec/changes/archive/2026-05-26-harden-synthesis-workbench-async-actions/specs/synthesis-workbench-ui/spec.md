## ADDED Requirements

### Requirement: Workbench host commands show asynchronous feedback

Synthesis Workbench SHALL provide immediate non-blocking feedback when a host
command is submitted.

#### Scenario: A user starts an asynchronous host command

- **WHEN** the user clicks a Workbench button that sends a host command
- **THEN** the clicked operation SHALL enter a pending state immediately
- **AND** matching buttons SHALL be disabled while that operation is in flight
- **AND** the UI SHALL expose an accessible busy state for the operation.

#### Scenario: A command completes or fails

- **WHEN** an in-flight host command completes or fails
- **THEN** the Workbench SHALL clear the matching pending state
- **AND** it SHALL show a lightweight completed or failed action summary
- **AND** it SHALL refresh the snapshot when the command can change service data.

### Requirement: Workbench prevents duplicate scoped host commands

Synthesis Workbench SHALL single-flight duplicate host commands that target the
same operation key.

#### Scenario: The same review action is clicked twice

- **WHEN** the same review action is already in flight
- **AND** the user clicks the same command again
- **THEN** the host SHALL NOT call the underlying service a second time
- **AND** the UI SHALL keep the existing pending state visible.

#### Scenario: Different scoped actions are clicked

- **WHEN** two host commands target different review ids, edge ids, or layout
  presets
- **THEN** the Workbench MAY execute them concurrently.

### Requirement: Workbench respects background job states

Synthesis Workbench SHALL disable or de-emphasize actions that are already queued
or running in the service state.

#### Scenario: Literature registry job is queued or running

- **WHEN** the Literature Registry job state is `queued` or `running`
- **THEN** rebuild actions for that job SHALL be disabled
- **AND** the UI SHALL show the queued or running state instead of allowing
  repeated clicks.

#### Scenario: Citation graph layout is pending

- **WHEN** the current layout preset is pending or running
- **THEN** layout recompute for that preset SHALL be disabled
- **AND** graph filters, search, and selection SHALL NOT create layout pending
  operations.
