# result-apply-handlers Specification

## Purpose
TBD - created by archiving change m2-baseline. Update Purpose after archive.
## Requirements
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

### Requirement: 结果回写必须具备幂等与安全语义
结果回写链路 MUST 在重试与异常场景下保持幂等、安全且可诊断。

#### Scenario: deferred terminal apply transient failure retries with backoff
- **WHEN** backend terminal state is `succeeded` but applyResult fails transiently
- **THEN** reconciler MUST retry apply with exponential backoff (max 5 attempts)
- **AND** retries MUST stop with `deferred-apply-exhausted` log after limit

