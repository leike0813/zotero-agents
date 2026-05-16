## MODIFIED Requirements

### Requirement: 系统必须按 requestKind 与 backend.type 解析 Provider

系统 MUST 基于 `requestKind + backend.type` 选择可执行 Provider，避免
workflow 与后端协议强耦合。

#### Scenario: SkillRunner job is remote SkillRunner only

- **WHEN** request kind is `skillrunner.job.v1`
- **THEN** the compatible provider/backend pair SHALL be `skillrunner`.
- **AND** ACP backends SHALL NOT accept this request kind directly.

#### Scenario: ACP skill run is ACP only

- **WHEN** request kind is `acp.skill.run.v1`
- **THEN** the compatible provider/backend pair SHALL be `acp`.
- **AND** the payload SHALL use local filesystem input paths rather than
  SkillRunner upload-relative paths.

#### Scenario: ACP workflow execution adapts SkillRunner-style requests

- **WHEN** a workflow declared as `skillrunner.job.v1` is executed on an ACP
  backend
- **THEN** workflow preparation SHALL convert each built request to
  `acp.skill.run.v1`
- **AND** upload-derived `input` fields SHALL contain the corresponding local
  absolute file path.
