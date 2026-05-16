# workflow-execution-pipeline Specification

## Purpose
TBD - created by archiving change m2-baseline. Update Purpose after archive.
## Requirements
### Requirement: 系统必须提供完整 workflow 执行流水线
系统 MUST 支持从 workflow 加载、输入筛选、请求构建、provider 执行到结果应用的端到端执行链路。

#### Scenario: 标准执行流程
- **WHEN** 用户触发一个合法 workflow
- **THEN** 系统完成加载 -> build requests -> execute provider -> apply result 的串联执行

### Requirement: 系统必须在每个输入单元维度汇总结果
系统 MUST 对 succeeded/failed/skipped 进行逐单元记录，并输出可读摘要用于 UI 呈现。

#### Scenario: 混合执行结果
- **WHEN** 同一次 workflow 执行中出现成功、失败与跳过
- **THEN** 系统输出包含计数与失败原因的稳定摘要

### Requirement: Workflow Execution SHALL Not Dispatch Runtime-Only Parameters To Providers

Workflow execution MUST split resolved workflow parameters into provider-facing parameters and local runtime-only parameters before dispatching provider requests.

#### Scenario: Provider request excludes runtime-only parameter

- **GIVEN** a workflow parameter is declared with `runtimeOnly: true`
- **WHEN** the workflow request is compiled for a provider
- **THEN** the provider request `parameter` payload SHALL NOT include that parameter
- **AND** non-runtime-only parameters SHALL continue to be included.

#### Scenario: Apply hook receives runtime-only parameter locally

- **GIVEN** a workflow parameter is declared with `runtimeOnly: true`
- **WHEN** the workflow reaches applyResult
- **THEN** the apply hook SHALL receive the resolved value through local result context
- **AND** the hook SHALL NOT need to read the value from provider-visible request payloads.

#### Scenario: Runtime-only behavior is backend independent

- **WHEN** a workflow runs through remote SkillRunner or ACP Skills
- **THEN** runtime-only parameters SHALL be excluded from the provider dispatch payload in both paths
- **AND** local apply-time behavior SHALL receive the same runtime-only values.

