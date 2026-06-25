## MODIFIED Requirements

### Requirement: 系统必须维护任务运行态模型

系统 MUST 维护任务在运行期的状态（排队、执行、完成、失败），并提供稳定标识用于查询与展示。

#### Scenario: SkillRunner sequence step projection remains step-scoped

- **WHEN** a SkillRunner sequence workflow launches multiple steps
- **THEN** each step SHALL keep its independent task projection
- **AND** reconciler-owned apply settlement SHALL update that step projection
  rather than an outer sequence task row

#### Scenario: ACP run-store rows are not created for SkillRunner sequence requests

- **WHEN** a SkillRunner sequence step request id is settled by runtime or
  reconciler code
- **THEN** task runtime SHALL NOT create an ACP `skill-runs` record for that
  request id
- **AND** SkillRunner dashboard/history SHALL remain the visible task record
