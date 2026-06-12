## ADDED Requirements

### Requirement: ACP SkillRunner prompt failures SHALL bypass output repair

ACP SkillRunner-compatible runs SHALL classify ACP protocol-visible prompt
failures before output validation. These failures SHALL NOT be treated as
SkillRunner output contract failures and SHALL NOT trigger output repair.

#### Scenario: Empty inactive successful turn produces no repair

- **GIVEN** an ACP SkillRunner-compatible run needs structured assistant output
- **WHEN** `session/prompt` returns `end_turn`
- **AND** the prompt turn produced no non-empty assistant message text
- **AND** the plugin observed no ACP `session/update` activity during that
  prompt turn
- **AND** result-file fallback does not recover a valid result
- **THEN** the run SHALL fail with an ACP prompt failure diagnostic
- **AND** it SHALL NOT record output validation failure
- **AND** it SHALL NOT start output repair.

#### Scenario: Empty active successful turn remains output-governed

- **GIVEN** an ACP SkillRunner-compatible run needs structured assistant output
- **WHEN** `session/prompt` returns `end_turn`
- **AND** the prompt turn produced no non-empty assistant message text
- **AND** the plugin observed ACP `session/update` activity during that prompt
  turn
- **THEN** the run SHALL continue through normal result-file fallback and output
  validation
- **AND** invalid or missing structured output SHALL remain eligible for bounded
  output repair.

#### Scenario: Protocol stop reason produces no repair

- **WHEN** `session/prompt` returns `refusal`, `max_tokens`, `max_turn_requests`,
  or a non-user-requested `cancelled`
- **THEN** the run SHALL fail with an ACP prompt stopped diagnostic
- **AND** it SHALL NOT start output repair.

#### Scenario: Protocol request error produces no repair

- **WHEN** the ACP adapter exposes a `session/prompt` request error to the plugin
- **THEN** the run SHALL fail with that plugin-visible prompt error diagnostic
- **AND** it SHALL NOT start output repair.

#### Scenario: Prompt failure remains recoverable when the session is recoverable

- **GIVEN** the ACP run has an established session that can be reattached
- **WHEN** prompt failure governance fails the run
- **THEN** the run SHALL be terminal `failed`
- **AND** the conversation SHALL be `closed`
- **AND** recovery SHALL remain `available`.
