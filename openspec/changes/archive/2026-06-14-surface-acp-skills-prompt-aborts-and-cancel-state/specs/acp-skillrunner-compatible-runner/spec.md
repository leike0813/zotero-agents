## MODIFIED Requirements

### Requirement: ACP SkillRunner prompt failures SHALL bypass output repair

ACP SkillRunner-compatible runs SHALL classify ACP protocol-visible prompt
failures before output validation. These failures SHALL NOT be treated as
SkillRunner output contract failures and SHALL NOT trigger output repair.

#### Scenario: ACP-visible backend prompt error produces no repair

- **WHEN** the ACP adapter exposes a backend prompt error from a JSON-RPC response
  or an explicit prompt-level provider `session/update` extension such as
  `backend_error` or `prompt_error`
- **THEN** the run SHALL fail with that plugin-visible prompt error diagnostic
- **AND** it SHALL NOT start output repair
- **AND** the transcript SHALL include a high-signal ACP prompt failure item.

#### Scenario: Tool failure updates remain output governed

- **WHEN** the ACP backend emits `tool_call` or `tool_call_update` with a failed
  or error status
- **AND** the prompt later returns assistant output
- **THEN** the runner SHALL NOT classify that tool update as an ACP prompt
  lifecycle failure
- **AND** the assistant output SHALL continue through normal output validation,
  apply, or bounded repair.

#### Scenario: Prompt-level provider diagnostic does not override assistant output

- **WHEN** an explicit prompt-level provider diagnostic is observed through
  `session/update`
- **AND** the same prompt turn has produced non-empty assistant text
- **THEN** the runner SHALL continue through normal output validation, apply, or
  bounded repair instead of failing solely on that diagnostic.

#### Scenario: User-interrupted turn does not become output governed

- **GIVEN** the user cancels the current ACP Skills prompt turn
- **WHEN** the backend later completes `session/prompt` with `end_turn`
- **THEN** the runner SHALL record the turn as interrupted
- **AND** it SHALL set the ACP skill run to `status = "waiting_user"`
- **AND** it SHALL clear `activePrompt` and `replyState`
- **AND** it SHALL NOT enter result-file fallback, output validation, or output
  repair
- **AND** the run SHALL remain non-terminal unless the user separately cancels
  the task.

#### Scenario: User-interrupted sequence step does not continue downstream

- **GIVEN** an ACP Skills run is executing as a non-final
  `skillrunner.sequence.v1` step
- **WHEN** the user cancels the current ACP prompt turn
- **THEN** the provider result SHALL be deferred with
  `backendStatus = "waiting_user"`
- **AND** the parent sequence SHALL remain parked on the current step
- **AND** downstream sequence steps SHALL NOT start until the user replies and
  the current step later produces a non-deferred successful result.

#### Scenario: Interrupted connected run becomes user-replyable

- **GIVEN** an ACP Skills run is connected
- **AND** the current prompt turn has been interrupted
- **WHEN** the ACP Skills panel renders the run
- **THEN** the interaction SHALL NOT be shown as agent-working
- **AND** the reply composer SHALL be enabled for normal user reply
- **AND** the current-turn cancel action SHALL NOT be exposed.

### Requirement: ACP Skills detached running runs SHALL be recoverable by explicit connect

ACP Skills SHALL treat non-terminal runs with a recoverable closed conversation
as detached recoverable runs, not as active prompt turns.

#### Scenario: Connected idle running run is not interruptable

- **GIVEN** an ACP Skills run is non-terminal
- **AND** `conversationRecoveryState` is `connected`
- **AND** `activePrompt` is false
- **AND** `replyState` is `idle`
- **WHEN** the ACP Skills panel renders the run
- **THEN** the composer SHALL NOT emit current-turn interrupt
- **AND** the current-turn cancel button SHALL NOT appear enabled.
