## MODIFIED Requirements

### Requirement: 系统必须维护任务运行态模型

系统 MUST 维护任务在运行期的状态（排队、执行、完成、失败），并提供稳定标识用于查询与展示。

#### Scenario: SkillRunner sequence steps have independent task projection

- **WHEN** a SkillRunner sequence workflow launches multiple steps
- **THEN** each step SHALL have an independent task projection
- **AND** the projection SHALL include `skillId`, `sequenceStepId`,
  `sequenceStepIndex`, backend `requestId`, and workflow run identity
- **AND** dashboard/task lists SHALL NOT merge multiple sequence steps into one
  task row

#### Scenario: SkillRunner sequence task label uses skill identity

- **WHEN** dashboard or SkillRunner panel renders a sequence step task
- **THEN** the secondary task label SHALL use the step skill name or skill id
- **AND** the UI SHALL NOT expose opaque generated job ids as the primary
  user-readable step identity
