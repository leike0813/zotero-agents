## ADDED Requirements

### Requirement: ACP Skills controls distinguish turn, connection, and task cancellation

ACP Skills SHALL treat current-turn cancel, connection disconnect, and task
cancel as separate user actions with separate state transitions.

#### Scenario: Current turn cancel stops only the active prompt

- **WHEN** the user cancels the current ACP Skills prompt turn
- **THEN** Host SHALL stop the active ACP prompt call
- **AND** the run SHALL remain non-terminal
- **AND** the ACP connection SHALL remain available for later prompts
- **AND** assistant text returned after the cancel SHALL NOT enter output
  validation, result-file fallback, or output repair.

#### Scenario: Disconnect stops the turn before detaching

- **WHEN** the user disconnects an ACP Skills run during an active prompt turn
- **THEN** Host SHALL stop the active prompt turn before detaching the local
  connection
- **AND** the run SHALL remain non-terminal and recoverable
- **AND** assistant text returned after the disconnect SHALL NOT enter output
  validation, result-file fallback, or output repair.

#### Scenario: Task cancel is terminal

- **WHEN** the user cancels the ACP Skills task
- **THEN** Host SHALL stop the active prompt turn and detach the connection
- **AND** the run SHALL become terminal `canceled`
- **AND** any parent sequence SHALL NOT start downstream steps.
