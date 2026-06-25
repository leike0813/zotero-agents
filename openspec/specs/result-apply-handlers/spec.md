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

### Requirement: Builtin apply hooks preserve skill diagnostics without treating them as apply blockers

Builtin workflow apply hooks SHALL treat skill output `warnings`, `error`, `status`, `kind`, and `reason` fields as diagnostics for result application. A non-null skill output `error` or failed-like skill output status SHALL NOT by itself prevent a hook from applying otherwise usable business artifacts or mutation fields.

#### Scenario: Diagnostics do not block usable apply output

- **WHEN** a builtin apply hook receives canonical business output containing usable apply artifacts or mutation fields
- **AND** the same output contains `error`, failed-like `status`, failed-like `kind`, or `reason`
- **THEN** the hook SHALL attempt the normal business apply path
- **AND** the hook SHALL decide success from the result of that business apply path.

#### Scenario: Warnings are returned with apply results

- **WHEN** a builtin apply hook receives output containing `warnings`
- **THEN** successful and skipped apply returns SHALL include normalized warnings.

#### Scenario: Skill diagnostics accompany apply failures and skips

- **WHEN** a builtin apply hook cannot apply because required business input is missing or malformed
- **THEN** the skipped return SHALL include available skill diagnostics.
- **WHEN** a builtin apply hook throws because the business apply path failed
- **THEN** the thrown error SHALL include a compact summary of available skill diagnostics.

