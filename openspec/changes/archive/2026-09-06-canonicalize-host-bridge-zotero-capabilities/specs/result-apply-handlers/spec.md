## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Path-backed attachment creation SHALL apply creation metadata atomically
**Reason**: Public path-backed handler creation is replaced by canonical prepared-file attachment writes.
**Migration**: Use the explicit Broker attachment mutation projection.

### Requirement: Parent metadata handler SHALL update fields and creators together
**Reason**: Public metadata handlers duplicate the canonical Broker mutation owner.
**Migration**: Use the explicit Broker metadata mutation projection.
