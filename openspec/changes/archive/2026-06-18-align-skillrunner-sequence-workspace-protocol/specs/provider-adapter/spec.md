## MODIFIED Requirements

### Requirement: ACP executes sequence steps with workflow workspace intent

The ACP execution path SHALL support workflow workspace intent for skill runs
launched by `skillrunner.sequence.v1`.

#### Scenario: SkillRunner sequence remains frontend-orchestrated

- **WHEN** a `skillrunner.sequence.v1` workflow targets a SkillRunner backend
- **THEN** plugin SHALL launch one ordinary SkillRunner job request per step
- **AND** the SkillRunner backend SHALL NOT be treated as owning a native
  multi-step sequence run

#### Scenario: First SkillRunner sequence step creates backend workspace

- **WHEN** the first SkillRunner sequence step is launched
- **THEN** the request SHALL NOT contain `runtime_options.workspace.request_id`
- **AND** any frontend routing scope id SHALL NOT be used as a backend workspace
  reuse handle

#### Scenario: Downstream SkillRunner sequence step reuses previous request workspace

- **GIVEN** a previous SkillRunner sequence step succeeded with backend
  `requestId`
- **WHEN** a later sequence step is launched
- **THEN** the request SHALL include
  `runtime_options.workspace = { mode: "reuse", request_id: "<previous requestId>" }`
- **AND** the request SHALL remain an ordinary `skillrunner.job.v1` request

### Requirement: Provider 执行结果必须统一为标准模型

系统 MUST 将不同 Provider 的执行输出归一为统一结果结构，供 runtime 与 `applyResult` 消费。

#### Scenario: SkillRunner bundle terminal result resolves namespaced result JSON

- **WHEN** a SkillRunner bundle request succeeds for skill `<skillId>`
- **THEN** provider execution SHALL resolve `result/<skillId>.<n>/result.json`
  from the bundle before the legacy `result/result.json` fallback
- **AND** the succeeded provider result SHALL expose the parsed `resultJson`
- **AND** sequence handoff SHALL consume that parsed result rather than the
  polling snapshot

#### Scenario: SkillRunner bundle terminal result without result JSON fails closed

- **WHEN** a SkillRunner bundle request succeeds but neither the namespaced
  result JSON nor legacy fallback is present
- **THEN** provider execution SHALL fail the request locally with a structured
  result-resolution error
- **AND** plugin SHALL NOT use the backend polling snapshot as step output
