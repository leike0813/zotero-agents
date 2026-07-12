## ADDED Requirements

### Requirement: Kilo ACP Skill runs SHALL safely omit rejected none reasoning overrides

Before an ACP Skill prompt starts, the runner SHALL omit a Kilo
`thought_level=none` override when the config request returns JSON-RPC invalid
parameters (`-32602`). It SHALL retain the same session and selected model,
continue with the backend-default reasoning behavior, and record the fallback
as a structured run event. The persisted effective runtime options SHALL not
restore the rejected override.

#### Scenario: Initial prompt continues after Kilo none rejection

- **WHEN** a new Kilo ACP session rejects `thought_level=none` with code `-32602`
- **THEN** the runner SHALL submit the prompt once in that same session without a thought-level override
- **AND** the run SHALL record the fallback without marking the task failed.

#### Scenario: Recovered session does not resend rejected none

- **GIVEN** a prior Kilo run recorded the none fallback
- **WHEN** the session is recovered
- **THEN** runtime-option restoration SHALL not submit `thought_level=none`
- **AND** the recovered prompt SHALL retain the selected model and normal recovery behavior.

#### Scenario: Other configuration failures are preserved

- **WHEN** a non-Kilo backend, a value other than `none`, or a non-`-32602` error occurs
- **THEN** the runner SHALL preserve the configuration failure
- **AND** it SHALL not start a fallback prompt.
