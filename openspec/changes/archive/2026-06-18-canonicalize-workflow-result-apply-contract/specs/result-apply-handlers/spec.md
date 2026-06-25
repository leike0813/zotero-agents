## MODIFIED Requirements

### Requirement: 系统必须通过 applyResult + handlers 执行结果回写

系统 MUST 将 Provider 成功结果通过标准化 `applyResult + handlers` 路径回写到
Zotero 数据层。

#### Scenario: Builtin apply hooks consume canonical result JSON

- **WHEN** a builtin workflow apply hook needs business output fields
- **THEN** it SHALL read them from `resultContext.resultJson` or
  `runResult.resultJson`
- **AND** it SHALL NOT parse `responseJson.result`, `responseJson.data`, or a
  SkillRunner `/result` wrapper as business output.

#### Scenario: Builtin apply hooks consume artifacts through result context

- **WHEN** a builtin workflow apply hook needs output artifact text
- **THEN** it SHALL read the artifact through `resultContext.readArtifactText()`
  when a result context is available
- **AND** ACP and SkillRunner physical artifact layout differences SHALL remain
  outside the hook business logic.

#### Scenario: Canonical outputs apply on ACP and SkillRunner

- **WHEN** debug-probe, literature-explainer, tag-regulator, translator,
  analysis, or deep-reading apply hooks receive canonical business output from
  either ACP or SkillRunner
- **THEN** the hook SHALL apply the result using the same business parsing path.
