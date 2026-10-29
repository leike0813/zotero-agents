# Spec Delta

## ADDED Requirements

### Requirement: ACP startup configuration failures SHALL block the first prompt

Before an ACP SkillRunner-compatible run sends its first prompt, a runtime-option
configuration failure SHALL fail the run. The failure SHALL NOT be retried through
an alternate RPC path, SHALL NOT continue with backend-default reasoning, and
SHALL NOT enter result-file fallback, output validation, or output repair.

#### Scenario: Rejected config option blocks the prompt

- **GIVEN** a run has a selected mode, model, or reasoning value
- **WHEN** the startup configuration request fails
- **THEN** the run SHALL fail before sending the first prompt
- **AND** it SHALL NOT enter output repair or result-file fallback.

#### Scenario: Advertised setter failure does not switch RPC paths

- **GIVEN** the backend advertises a config setter for a category
- **WHEN** that setter rejects the configured value
- **THEN** the run SHALL fail with the backend rejection
- **AND** it SHALL NOT retry the same value through a native model or mode RPC.

#### Scenario: Native RPC is used only for unadvertised categories

- **GIVEN** the backend advertises no config setter for a category
- **WHEN** a value for that category must be applied
- **THEN** the runner MAY use the native model or mode RPC for that category.

### Requirement: ACP configuration failures SHALL retain backend JSON-RPC detail

A backend rejection of a runtime-option configuration SHALL preserve the
JSON-RPC error codes `-32601`, `-32602`, and `-32603` unchanged and SHALL record
`code`, `data`, `method`, `configId`, and `value` through the existing ACP
diagnostics and runtime-log detail sinks. Recorded evidence SHALL be redacted,
and the diagnostic message SHALL include the backend's `data.details`.

#### Scenario: Method-not-found is propagated verbatim

- **WHEN** a configuration request fails with JSON-RPC code `-32601`
- **THEN** the recorded diagnostic SHALL retain `-32601` unchanged
- **AND** it SHALL include `method`, `configId`, and the attempted `value`.

#### Scenario: Invalid params carries backend details in the message

- **WHEN** a configuration request fails with `-32602` and the backend error data carries `details`
- **THEN** the recorded diagnostic message SHALL include those backend details
- **AND** the structured fields SHALL include `code`, `data`, `method`, `configId`, and `value`.

#### Scenario: Recorded evidence is redacted

- **WHEN** any of these configuration failure fields are recorded
- **THEN** the plugin SHALL apply the existing diagnostic redaction rules
- **AND** secrets SHALL NOT appear in the runtime log or audit evidence.

## REMOVED Requirements

### Requirement: Kilo ACP Skill runs SHALL safely omit rejected none reasoning overrides
**Reason**: Silently omitting a rejected reasoning value let the run continue with
reasoning the user never selected, and the rejection was decided by inspecting the
backend product identity and error text. Backend configuration rejections are now
reported faithfully and block the first prompt.
**Migration**: A backend that rejects a reasoning value fails the run with the
backend's own JSON-RPC error. No backend-specific downgrade path remains, and the
Kilo `thought_level` effort-fallback module is deleted.
