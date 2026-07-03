## MODIFIED Requirements

### Requirement: ACP Skills SHALL preserve recoverable remote sessions

ACP Skills SHALL detach local controllers on plugin shutdown without ending
remote ACP sessions when a run has a session id and was not explicitly ended or
canceled. Shutdown detach SHALL be bounded and best-effort so a stuck controller
or adapter close cannot block plugin exit.

#### Scenario: Shutdown preserves session

- **GIVEN** an ACP Skill run has `sessionId`
- **AND** plugin shutdown runs
- **THEN** the local controller SHALL be detached
- **AND** the run record SHALL show `conversationState = "closed"` and
  `conversationRecoveryState = "available"`
- **AND** the remote session is not canceled or ended.

#### Scenario: Shutdown detach timeout preserves recoverable run

- **GIVEN** an ACP Skill run has a live controller
- **WHEN** plugin shutdown runs and the controller disconnect promise does not
  settle
- **THEN** shutdown SHALL continue after the bounded timeout
- **AND** the local controller registry SHALL release that controller
- **AND** the run record SHALL show `activePrompt = false`,
  `conversationState = "closed"`, `conversationRecoveryState = "available"`,
  and `connectionActionState = "idle"`
- **AND** the run SHALL NOT be marked failed solely because shutdown timed out.

#### Scenario: Waiting user survives shutdown

- **GIVEN** an ACP Skill workflow run is waiting for user input
- **AND** the run has a recoverable session and pending interaction
- **WHEN** plugin shutdown detaches local controllers
- **THEN** the run SHALL remain `waiting_user`
- **AND** reconnect or reply can continue the same session.

#### Scenario: Startup reconciles active run

- **GIVEN** the plugin restarts and finds an active non-terminal ACP Skill run
  without a live controller
- **WHEN** startup reconciliation runs
- **THEN** recoverable runs SHALL become locally closed and available
- **AND** unrecoverable runs SHALL be marked failed with explicit
  unrecoverable session loss.
