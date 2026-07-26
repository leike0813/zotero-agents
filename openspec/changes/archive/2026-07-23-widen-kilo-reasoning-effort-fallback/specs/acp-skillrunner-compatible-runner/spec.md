## MODIFIED Requirements

### Requirement: Kilo ACP Skill runs SHALL safely omit rejected none reasoning overrides

Before an ACP Skill prompt starts, the runner SHALL omit a Kilo
`thought_level` override when the config request returns JSON-RPC invalid
parameters (`-32602`) and the error message indicates an effort-related
rejection. It SHALL retain the same session and selected model,
continue with the backend-default reasoning behavior, and record the fallback
as a structured diagnostic event. The persisted effective runtime options SHALL
not restore the rejected override.

#### Scenario: Initial prompt continues after Kilo none rejection

- **WHEN** a new Kilo ACP session rejects a `thought_level` value with code `-32602` and error message indicating an effort-related rejection
- **THEN** the runner SHALL submit the prompt once in that same session without a thought-level override
- **AND** the run SHALL record the fallback as a diagnostic event without marking the task failed.

#### Scenario: Recovered session does not resend rejected none

- **GIVEN** a prior Kilo run recorded an effort fallback
- **WHEN** the session is recovered
- **THEN** runtime-option restoration SHALL not submit the rejected `thought_level` value
- **AND** the recovered prompt SHALL retain the selected model and normal recovery behavior.

#### Scenario: Other configuration failures are preserved

- **WHEN** a non-Kilo backend, a non-`-32602` error, or a `-32602` error whose message does not indicate an effort-related rejection occurs
- **THEN** the runner SHALL preserve the configuration failure
- **AND** it SHALL not start a fallback prompt.
