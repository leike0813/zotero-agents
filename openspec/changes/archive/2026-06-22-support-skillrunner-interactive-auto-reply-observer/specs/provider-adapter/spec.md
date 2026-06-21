## ADDED Requirements

### Requirement: SkillRunner interactive auto reply option SHALL be feature-gated

SkillRunner provider dispatch SHALL include `runtime_options.interactive_auto_reply`
only when the plugin feature switch is enabled, the workflow is interactive,
and provider options explicitly enable it.

#### Scenario: Feature disabled strips auto reply

- **WHEN** provider options contain `interactive_auto_reply: true`
- **AND** the feature switch is disabled
- **THEN** SkillRunner job creation SHALL NOT include
  `runtime_options.interactive_auto_reply`.

#### Scenario: Feature enabled preserves interactive auto reply

- **WHEN** provider options contain `interactive_auto_reply: true`
- **AND** the feature switch is enabled
- **AND** the request execution mode is `interactive`
- **THEN** SkillRunner job creation SHALL include
  `runtime_options.interactive_auto_reply: true`.

### Requirement: SkillRunner interactive auto reply timeout SHALL follow auto reply visibility

SkillRunner provider dispatch SHALL include
`runtime_options.interactive_reply_timeout_sec` only when interactive auto reply
is enabled for the run.

#### Scenario: Timeout is hidden and stripped unless auto reply is enabled

- **WHEN** provider options contain `interactive_reply_timeout_sec`
- **AND** the feature switch is disabled, execution mode is not `interactive`, or
  `interactive_auto_reply` is not true
- **THEN** SkillRunner job creation SHALL NOT include
  `runtime_options.interactive_reply_timeout_sec`.

#### Scenario: Timeout accepts zero and positive seconds

- **WHEN** provider options contain `interactive_auto_reply: true`
- **AND** the feature switch is enabled
- **AND** the request execution mode is `interactive`
- **AND** `interactive_reply_timeout_sec` is a non-negative integer
- **THEN** SkillRunner job creation SHALL include
  `runtime_options.interactive_reply_timeout_sec` with that integer value.
