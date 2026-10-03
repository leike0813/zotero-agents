# Spec Delta

## ADDED Requirements

### Requirement: Prepared request controls instructions and executable tools

Every model request SHALL use the committed project preparation for instructions, messages and tool declarations. The executable tool set SHALL match those declarations. Preparing another invocation SHALL replace request facts without accumulating stale instructions or tools. Preparation failure SHALL prevent Provider dispatch.

#### Scenario: Preparation replaces tools before the first request
- **WHEN** committed preparation replaces the initial instructions and tools
- **THEN** the model sees the replacement facts and calls execute only the replacement tools

#### Scenario: Preparation fails after a tool result
- **WHEN** the next invocation cannot commit preparation
- **THEN** no next Provider request occurs and one structured failed project terminal is published

### Requirement: Project waits stop model continuation

A completed assistant/tool cycle SHALL NOT schedule another model request while the project is waiting for permission or user input, suspended, canceled, effect-unknown or blocked by LoopGuard. Normal tool continuation SHALL make only the naturally required next request. SDK cycle completion SHALL NOT independently finalize the durable owner.

#### Scenario: Tool batch waits for a user
- **WHEN** the project batch returns waiting_user
- **THEN** the turn reports waiting_user without another model request or fabricated tool reply

#### Scenario: Normal tool batch continues
- **WHEN** all admitted tool calls settle normally
- **THEN** their results enter one subsequent prepared request without an additional forced request
