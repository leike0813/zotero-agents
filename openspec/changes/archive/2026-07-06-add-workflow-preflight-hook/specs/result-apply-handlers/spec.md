## MODIFIED Requirements

### Requirement: 系统必须通过 applyResult + handlers 执行结果回写

系统 MUST 将 Provider 成功结果通过标准化 `applyResult + handlers` 路径回写到
Zotero 数据层。

#### Scenario: Preflight short-circuit uses standard applyResult

- **WHEN** preflight returns a short-circuit apply result
- **THEN** the runtime SHALL call the workflow `applyResult`
- **AND** the workflow SHALL use the same handlers path as provider-backed applies.

#### Scenario: Aggregate apply uses standard applyResult

- **WHEN** preflight replacement units are grouped into a single aggregate apply
- **THEN** the runtime SHALL call the workflow `applyResult` once
- **AND** result writeback SHALL still go through workflow handlers.

### Requirement: Result context SHALL expose preflight and aggregate execution metadata

Workflow apply hooks SHALL receive preflight and aggregate metadata through
`WorkflowResultContext` when runtime generated that metadata.

#### Scenario: Preflight metadata is available to applyResult

- **WHEN** a request was created from a preflight-planned unit
- **THEN** `resultContext.preflight` SHALL expose the plan id, unit id, unit order, and context.

#### Scenario: Aggregate child results are available to applyResult

- **WHEN** aggregate single-apply runs
- **THEN** `resultContext.aggregate.children` SHALL expose each child request, child run result, child result context, bundle reader, preflight context, and ordered unit identity.
