# result-apply-handlers Specification

## Purpose
TBD - created by archiving change m2-baseline. Update Purpose after archive.

## Requirements

### Requirement: 系统必须通过 applyResult + handlers 执行结果回写

系统 MUST 将 Provider 成功结果通过标准化 applyResult 与具名 canonical Broker mutation 路径回写到 Zotero 数据层。workflow hook 只能经 runtime.hostApi 的显式 mutation、notes、attachments 投影调用，不能访问 handlers、原生 Zotero API 或 handler-shaped operation alias。结果回写所需的 native effects 由 Broker 私有实现持有，不能形成公开 DSL。

#### Scenario: Builtin apply hooks consume canonical result JSON
- **WHEN** a builtin workflow apply hook needs business output fields
- **THEN** it SHALL read them from resultContext.resultJson or runResult.resultJson
- **AND** it SHALL not parse responseJson.result, responseJson.data, or a SkillRunner result wrapper as business output.

#### Scenario: Canonical outputs apply on ACP and SkillRunner
- **WHEN** an apply hook receives canonical business output from either ACP or SkillRunner
- **THEN** the hook SHALL apply the result using the same business parsing path and explicit Broker projection.

#### Scenario: Builtin apply hooks consume artifacts through result context
- **WHEN** a builtin workflow apply hook needs output artifact text
- **THEN** it SHALL read the artifact through resultContext.readArtifactText when a result context is available
- **AND** physical artifact layout differences SHALL remain outside hook business logic.

#### Scenario: Preflight short-circuit uses standard applyResult
- **WHEN** preflight returns a short-circuit apply result
- **THEN** the runtime SHALL call workflow applyResult
- **AND** writeback SHALL use the same explicit canonical Broker mutation path.

#### Scenario: Aggregate apply uses standard applyResult
- **WHEN** aggregate single-apply runs
- **THEN** the runtime SHALL call the workflow applyResult once
- **AND** result writeback SHALL still use explicit canonical Broker mutations.

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

### Requirement: Result context SHALL expose preflight and aggregate execution metadata

Workflow apply hooks SHALL receive preflight and aggregate metadata through
`WorkflowResultContext` when runtime generated that metadata.

#### Scenario: Preflight metadata is available to applyResult

- **WHEN** a request was created from a preflight-planned unit
- **THEN** `resultContext.preflight` SHALL expose the plan id, unit id, unit order, and context.

#### Scenario: Aggregate child results are available to applyResult

- **WHEN** aggregate single-apply runs
- **THEN** `resultContext.aggregate.children` SHALL expose each child request, child run result, child result context, bundle reader, preflight context, and ordered unit identity.
