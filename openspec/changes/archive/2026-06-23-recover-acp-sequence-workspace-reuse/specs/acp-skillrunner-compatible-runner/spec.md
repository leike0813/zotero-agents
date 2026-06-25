## MODIFIED Requirements

### Requirement: ACP Skills detached running runs SHALL be recoverable by explicit connect

ACP Skills SHALL treat non-terminal runs with a recoverable closed conversation
as detached recoverable runs, not as active prompt turns.

#### Scenario: Detached running run needs user reconnect

- **GIVEN** an ACP Skills run is `running`, `repairing`, or recoverable `failed`
- **AND** the run has a remote `sessionId`
- **AND** `conversationState` is `closed`
- **AND** `conversationRecoveryState` is `available`
- **AND** `activePrompt` is false
- **WHEN** the ACP Skills panel renders the run
- **THEN** the run SHALL be shown as needing user reconnect
- **AND** the composer SHALL NOT emit current-turn interrupt for that run
- **AND** the task row SHALL indicate that user action is required.

#### Scenario: Connected idle running run is not interruptable

- **GIVEN** an ACP Skills run is non-terminal
- **AND** `conversationRecoveryState` is `connected`
- **AND** `activePrompt` is false
- **AND** `replyState` is `idle`
- **WHEN** the ACP Skills panel renders the run
- **THEN** the composer SHALL NOT emit current-turn interrupt
- **AND** the current-turn cancel button SHALL NOT appear enabled.

#### Scenario: Explicit connect starts recovered continuation

- **GIVEN** a detached recoverable ACP Skills run has workflow output convergence context
- **AND** it has no pending user interaction or pending permission request
- **WHEN** the user connects the run
- **THEN** Host SHALL attach the existing ACP session
- **AND** Host SHALL send the recovered continuation guard prompt
- **AND** output validation, result-file fallback, repair, pending interaction,
  final apply, and sequence continuation SHALL follow the existing recovered
  continuation behavior.

#### Scenario: Explicit connect resumes reusable workflow workspace

- **GIVEN** a detached recoverable ACP Skills run is a non-final sequence step
- **AND** the original workflow workspace still exists
- **WHEN** explicit connect produces final recovered output
- **THEN** downstream ACP sequence steps SHALL reuse the original workflow
  workspace
- **AND** runner-owned result and audit paths SHALL use fresh namespaces.

#### Scenario: Explicit connect foregrounds downstream ACP sequence steps

- **GIVEN** a detached recoverable ACP Skills run is a non-final sequence step
- **AND** explicit connect produces final recovered output
- **WHEN** Host launches downstream ACP sequence steps
- **THEN** each started downstream ACP step SHALL become the selected ACP Skills
  run
- **AND** interactive downstream ACP steps SHALL request the ACP Skills panel as
  the foreground surface.

#### Scenario: Pending interaction waits after connect

- **GIVEN** a detached recoverable ACP Skills run has a pending user interaction
  or pending permission request
- **WHEN** the user connects the run
- **THEN** Host SHALL attach the existing ACP session
- **AND** Host SHALL NOT send an automatic continuation prompt
- **AND** the run SHALL remain user-actionable for the pending reply or
  permission.

#### Scenario: Recovered current-turn cancel does not detach

- **GIVEN** an ACP Skills run has been recovered and has an active prompt turn
- **WHEN** the user cancels the current turn from the composer
- **THEN** Host SHALL stop the active ACP prompt call
- **AND** the ACP session controller SHALL remain attached
- **AND** the run SHALL remain non-terminal and recoverable for later prompts.
