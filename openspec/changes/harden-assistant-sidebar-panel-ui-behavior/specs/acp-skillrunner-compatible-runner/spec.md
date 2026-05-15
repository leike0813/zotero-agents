## ADDED Requirements

### Requirement: ACP Skills Busy Composer SHALL Interrupt Current Turn Without Canceling Run

ACP Skills MUST distinguish interrupting the current agent turn from canceling the whole skill run.

#### Scenario: Busy ACP Skills run exposes interrupt action

- **WHEN** an ACP Skills run is `queued`, `running`, or `repairing`
- **THEN** the composer input SHALL be disabled
- **AND** the composer button SHALL emit an interrupt-current-turn action
- **AND** it SHALL NOT emit `cancel-run`.

#### Scenario: Interrupt does not cancel run record

- **WHEN** the user interrupts the current ACP Skills turn from the composer
- **THEN** the run SHALL remain available in the run list
- **AND** the run status SHALL NOT be changed to `canceled`
- **AND** the session SHALL NOT be disconnected by that action.

### Requirement: ACP Skills Panel SHALL Preserve Per-Run Composer State

ACP Skills frontend state MUST be isolated per selected run.

#### Scenario: Snapshot refresh does not steal focus

- **WHEN** a snapshot for one ACP Skills run refreshes while another run is selected
- **THEN** the selected run's input focus and draft SHALL be preserved.

#### Scenario: Terminal run continues conversation

- **WHEN** a completed run has an active follow-up prompt or reply in progress
- **THEN** the hint area SHALL show the active turn state
- **AND** it SHALL NOT remain stuck on `Run completed`.

### Requirement: ACP Skills Task Drawer SHALL Surface Waiting Tasks

ACP Skills task drawer rows MUST indicate tasks requiring user action.

#### Scenario: Waiting user task shows warning indicator

- **WHEN** a run is `waiting_user` or has a pending permission request
- **THEN** its drawer task row SHALL display a warning LED.

#### Scenario: Waiting transition emits one toast

- **WHEN** a run first enters `waiting_user` or permission-required state
- **THEN** the UI SHALL emit one toast for that transition
- **AND** repeated snapshots SHALL NOT emit duplicate toasts.
