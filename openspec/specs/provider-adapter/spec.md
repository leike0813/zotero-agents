# provider-adapter Specification

## Purpose
TBD - created by archiving change m2-baseline. Update Purpose after archive.
## Requirements
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

### Requirement: 系统必须对 Provider Request Contract 做统一校验
系统 MUST 在 runtime/provider dispatch 过程中复用同一套 Provider Request Contract 校验规则，保证请求类型、后端类型和请求负载约束一致。

#### Scenario: skillrunner mixed-input payload accepts arbitrary JSON input
- **WHEN** `skillrunner.job.v1` payload carries optional `input` as string/array/object with existing `parameter`
- **THEN** contract validation SHALL accept payload as long as mandatory fields remain valid
- **AND** provider execution path SHALL forward both `input` and `parameter` to backend `/v1/jobs`

### Requirement: Provider 执行结果必须统一为标准模型
系统 MUST 将不同 Provider 的执行输出归一为统一结果结构，供 runtime 与 `applyResult` 消费。

#### Scenario: skillrunner file-input mapping follows input-relative-path protocol
- **WHEN** request kind is `skillrunner.job.v1` and payload contains non-empty `upload_files`
- **THEN** provider contract SHALL require `input` to be object
- **AND** each `upload_files[].key` SHALL resolve to `input.<key>` relative path under uploads root
- **AND** upload zip entries SHALL use that resolved relative path instead of legacy key name

#### Scenario: inline-only skillrunner payload skips upload step
- **WHEN** request kind is `skillrunner.job.v1` and `upload_files` is missing or empty
- **THEN** execution chain SHALL skip `/upload`
- **AND** provider SHALL continue with `create -> poll -> result|bundle`

### Requirement: SkillRunner interactive execution SHALL defer terminal ownership to backend state machine
SkillRunner interactive 执行 SHALL 将终态裁决权交给后端状态机，插件侧仅负责同步与收敛。

#### Scenario: managed local backend ensures runtime before dispatch
- **WHEN** provider dispatch targets managed local backend `local-skillrunner-backend`
- **THEN** provider chain SHALL ensure local runtime is running before sending job create request
- **AND** ensure failure SHALL surface as provider error without mutating unrelated backend profiles

### Requirement: SkillRunner provider chain SHALL consume a single plugin-side state machine SSOT
SkillRunner provider/client/reconciler 全链路 SHALL 复用同一个插件侧状态机语义，避免分散判定导致漂移。

#### Scenario: non-managed skillrunner backend skips local runtime management
- **WHEN** provider dispatch targets a non-managed SkillRunner backend profile
- **THEN** provider chain SHALL NOT invoke local ctl/lease management
- **AND** request dispatch semantics SHALL remain unchanged from existing behavior

### Requirement: SkillRunner task ledger reconciliation SHALL run at startup and managed-local up boundaries
插件 MUST 在关键生命周期边界执行 SkillRunner 任务账本对账，避免展示后端已不存在的任务。

#### Scenario: startup reconcile covers all non-managed SkillRunner backends
- **WHEN** 插件启动完成并加载 backend registry
- **THEN** 插件 SHALL 对所有 `type=skillrunner` 且 `id != local-skillrunner-backend` 的 backend 执行一次后台对账
- **AND** 对账失败 SHALL 写入 error 级运行日志并弹出“与后端 <displayName> 通信失败”提示

#### Scenario: managed local backend reconciles only after each successful up
- **WHEN** 托管本地后端完成一次成功 `up` 链路（手动或自动）
- **THEN** 插件 SHALL 立即对该托管后端执行一次后台对账
- **AND** 插件启动阶段 SHALL NOT 对托管本地后端执行该一次性启动对账

### Requirement: SkillRunner provider dispatch MUST not fabricate terminal failed after request creation

SkillRunner provider/queue integration MUST treat post-create local failure as a
recoverable plugin-side diagnostic instead of terminal backend failure.

#### Scenario: request-created local dispatch failure stays pending for reconciler

- **WHEN** provider dispatch has already created backend `requestId`
- **AND** a later local dispatch step fails before foreground apply completes
- **THEN** foreground execution MUST keep that request pending for reconciler
- **AND** plugin MUST preserve `requestId` and diagnostic error text
- **AND** foreground workflow summary MUST NOT count that request as terminal
  failed

