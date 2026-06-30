## MODIFIED Requirements

### Requirement: SkillRunner sidebar refreshes use Assistant Workspace publish governance

SkillRunner sidebar snapshots SHALL use the same Assistant Workspace publish
policy as ACP Chat and ACP Skills.

SkillRunner canonical run state SHALL continue to update from run store, task,
backend health, permission, auto-reply, and observer events. Assistant/process
text transcript updates SHALL stream naturally when streaming render is enabled.
Metadata live updates SHALL publish at the shared cadence only when streaming
render is enabled. When streaming render is disabled, SkillRunner SHALL publish
visible transcript snapshots only at critical states or SkillRunner message
boundaries.

#### Scenario: SkillRunner disabled streaming publishes assistant message boundary

- **GIVEN** streaming render is disabled
- **WHEN** SkillRunner receives an `assistant_message` or `assistant_final`
  conversation entry
- **THEN** canonical run state records the entry
- **AND** the visible transcript publishes immediately with accumulated entries.

#### Scenario: SkillRunner disabled streaming publishes thinking boundary

- **GIVEN** streaming render is disabled
- **WHEN** SkillRunner receives an `assistant_process` entry whose process type
  is not `tool_call` or `command_execution`
- **THEN** canonical run state records the entry
- **AND** the visible transcript publishes immediately with accumulated entries.

#### Scenario: SkillRunner tool process waits for message boundary

- **GIVEN** streaming render is disabled
- **WHEN** SkillRunner receives an `assistant_process` entry whose process type
  is `tool_call` or `command_execution`
- **THEN** canonical run state records the entry
- **AND** the visible transcript does not publish until the next message,
  thinking, critical, or terminal boundary.

#### Scenario: SkillRunner foreground observation stays on SSE

- **GIVEN** streaming render is disabled
- **WHEN** the SkillRunner panel observes a running foreground run
- **THEN** it SHALL continue using foreground chat SSE
- **AND** it SHALL NOT switch to chat history polling.
