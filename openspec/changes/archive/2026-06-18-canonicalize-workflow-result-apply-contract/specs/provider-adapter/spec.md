## MODIFIED Requirements

### Requirement: Provider 执行结果必须统一为标准模型

系统 MUST 将不同 Provider 的执行输出归一为统一结果结构，供 runtime 与
`applyResult` 消费。

#### Scenario: SkillRunner result terminal result exposes business output

- **WHEN** a SkillRunner `/result` terminal success response is wrapped as
  `{ request_id, result: { data } }`
- **THEN** provider execution SHALL expose `result.data` as
  `ProviderExecutionResult.resultJson`
- **AND** the raw `/result` response SHALL remain available only as provider
  diagnostic metadata.

#### Scenario: SkillRunner direct result payload remains direct

- **WHEN** a SkillRunner `/result` terminal success response is already a direct
  business JSON payload
- **THEN** provider execution SHALL expose that payload unchanged as
  `ProviderExecutionResult.resultJson`
- **AND** provider execution SHALL NOT unwrap a business field named `result`
  unless the response has a SkillRunner result-envelope shape.

#### Scenario: ACP terminal result remains canonical

- **WHEN** an ACP skill run reaches terminal success
- **THEN** provider execution SHALL expose the business output as
  `ProviderExecutionResult.resultJson`
- **AND** ACP output SHALL NOT be wrapped in a SkillRunner-style envelope.

#### Scenario: SkillRunner bundle terminal result resolves namespaced result JSON

- **WHEN** a SkillRunner bundle request succeeds for skill `<skillId>`
- **THEN** provider execution SHALL resolve `result/<skillId>.<n>/result.json`
  from the bundle before the legacy `result/result.json` fallback
- **AND** the succeeded provider result SHALL expose the parsed `resultJson`
- **AND** sequence handoff SHALL consume that parsed result rather than the
  polling snapshot.
