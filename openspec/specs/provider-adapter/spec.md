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

#### Scenario: skillrunner local-package payload remains valid provider input
- **WHEN** `skillrunner.job.v1` payload carries `skill_source="local-package"` and a non-empty `skill_id`
- **THEN** provider contract validation SHALL accept the payload
- **AND** `skill_id` SHALL be treated as the plugin-side skill lookup key before backend dispatch

#### Scenario: skillrunner installed payload remains valid provider input
- **WHEN** `skillrunner.job.v1` payload carries `skill_source="installed"` and a non-empty `skill_id`
- **THEN** provider contract validation SHALL accept the payload
- **AND** provider execution SHALL preserve the installed-skill backend route

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
- **AND** 对账失败 SHALL 写入 error 级运行日志并弹出"与后端 <displayName> 通信失败"提示

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

### Requirement: ACP executes sequence steps with workflow workspace intent

The ACP execution path SHALL support workflow workspace intent for skill runs
launched by `skillrunner.sequence.v1`.

#### Scenario: SkillRunner sequence remains frontend-orchestrated

- **WHEN** a `skillrunner.sequence.v1` workflow targets a SkillRunner backend
- **THEN** plugin SHALL launch one ordinary SkillRunner job request per step
- **AND** the SkillRunner backend SHALL NOT be treated as owning a native
  multi-step sequence run

#### Scenario: SkillRunner sequence step apply is not foreground-owned

- **WHEN** a SkillRunner sequence step reaches backend terminal success
- **THEN** foreground sequence runtime SHALL NOT execute that step's
  `apply_result`
- **AND** foreground sequence runtime SHALL preserve the step request context so
  the SkillRunner reconciler can own terminal apply

#### Scenario: ACP sequence step apply remains foreground-owned

- **WHEN** a `skillrunner.sequence.v1` workflow targets an ACP backend
- **THEN** sequence runtime MAY execute declared step `apply_result` in the
  foreground ACP path
- **AND** ACP apply state SHALL be written only for ACP skill-run request ids

### Requirement: SkillRunner provider dispatch MUST not fabricate terminal failed after request creation

SkillRunner provider/queue integration MUST treat post-create transport or backend availability failures as recoverable plugin-side diagnostics, but MUST NOT recover terminal run-level client errors for a known request.

#### Scenario: request-created transport failure stays pending for reconciler

- **GIVEN** provider dispatch targets a SkillRunner backend
- **WHEN** provider dispatch has already created backend `requestId`
- **AND** a later upload, polling, or result request fails due to network error, timeout, `429`, or `5xx`
- **THEN** foreground execution MUST keep that request pending for reconciler
- **AND** plugin MUST preserve request context and request ledger ownership

#### Scenario: upload-backed request-created does not start observation

- **GIVEN** provider dispatch targets a SkillRunner backend and the request requires upload
- **WHEN** provider dispatch emits `request-created`
- **THEN** plugin MUST record the `requestId` for dispatch ownership
- **AND** plugin MUST NOT create recoverable observation context, open run UI, or start run polling for that request yet
- **WHEN** the upload step succeeds and provider emits `request-ready`
- **THEN** plugin MAY start the normal SkillRunner workspace observation and recoverable context flow

#### Scenario: request-created run-level client failure settles failed

- **GIVEN** provider dispatch has already created SkillRunner `requestId`
- **WHEN** upload, initial state fetch, polling, or result fetch returns `400`, `404`, `410`, or `422` for that request
- **THEN** provider execution MUST mark the local job/request as failed
- **AND** job queue MUST NOT coerce it back to `running`
- **AND** plugin MUST NOT preserve or create recoverable context for that failed request
- **AND** plugin MUST NOT mark the backend unreachable solely because of that run-level client error

#### Scenario: backend terminal state remains terminal

- **GIVEN** provider dispatch has already created SkillRunner `requestId`
- **WHEN** backend state for that request is terminal `failed` or `canceled`
- **THEN** foreground execution MUST preserve the terminal job result
- **AND** job queue MUST NOT convert it into recoverable pending state

### Requirement: SkillRunner provider polling MUST use absolute deadlines

SkillRunner provider polling MUST enforce a fixed elapsed deadline for each poll operation. Non-terminal backend responses MUST NOT reset the operation deadline.

#### Scenario: unchanged non-terminal responses do not reset timeout

- **GIVEN** provider execution is polling a SkillRunner request
- **WHEN** `/v1/jobs/{request_id}` repeatedly returns non-terminal `queued` or `running`
- **THEN** provider polling MUST stop when the configured poll timeout elapses from the original poll start
- **AND** provider polling MUST NOT extend the deadline merely because each response arrived successfully

#### Scenario: poll timeout remains recoverable after request creation

- **GIVEN** provider execution has already created a SkillRunner `requestId`
- **WHEN** provider polling reaches its absolute timeout while the backend remains non-terminal
- **THEN** foreground execution MUST preserve the request context for reconciler ownership
- **AND** plugin MUST treat the timeout as recoverable communication/availability uncertainty
- **AND** plugin MUST NOT fabricate terminal `failed` solely because of the timeout

#### Scenario: terminal response still stops polling immediately

- **WHEN** SkillRunner provider polling observes backend terminal `succeeded`, `failed`, or `canceled`
- **THEN** provider polling MUST stop immediately
- **AND** terminal ownership rules from existing SkillRunner provider requirements MUST remain unchanged

### Requirement: SkillRunner sequence terminal apply MUST be reconciler-owned

SkillRunner sequence steps MUST use the same terminal apply ownership model as
ordinary SkillRunner auto jobs.

#### Scenario: Reconciler applies terminal SkillRunner sequence step

- **GIVEN** a SkillRunner sequence step request is tracked by recoverable context
- **WHEN** the backend reports terminal success for that request
- **THEN** the SkillRunner reconciler SHALL fetch the terminal result material
- **AND** SHALL resolve the step result JSON from the SkillRunner result
  namespace
- **AND** SHALL execute the step's declared `apply_result` workflow before
  continuing to the next step

### Requirement: ACP and SkillRunner run state MUST use separated persistent stores

ACP Skills and SkillRunner MUST NOT share a persistent run-state SSOT.

#### Scenario: ACP skill run writes ACP-only store

- **WHEN** an ACP skill run is created or updated
- **THEN** plugin SHALL persist it in the ACP run store
- **AND** plugin SHALL NOT persist it as a generic task-row SSOT
- **AND** ACP run APIs SHALL reject non-ACP backend types.

#### Scenario: SkillRunner run writes SkillRunner-only store

- **WHEN** a SkillRunner request reaches request-ready or later lifecycle states
- **THEN** plugin SHALL persist it in the SkillRunner run store
- **AND** plugin SHALL NOT write `plugin_task_requests(domain=skillrunner)`
- **AND** plugin SHALL NOT write `plugin_task_contexts(domain=skillrunner)`
- **AND** task rows and dashboard history SHALL be derived from the SkillRunner run store rather than treated as state owners.

#### Scenario: legacy SkillRunner stores are cleanup-only

- **WHEN** plugin initializes runtime state after this change
- **THEN** legacy SkillRunner request/context rows SHALL only be deleted by upgrade cleanup
- **AND** runtime restore, reconcile, session sync, and settlement SHALL NOT read them.

### Requirement: SkillRunner sequence remains frontend-orchestrated

SkillRunner sequence execution MUST remain a frontend orchestration of multiple
ordinary backend requests.

#### Scenario: SkillRunner sequence step identity is independent

- **WHEN** a SkillRunner sequence step is started
- **THEN** the step SHALL have its own SkillRunner run record and backend request id
- **AND** the sequence root SHALL be stored as a non-projectable SkillRunner run
- **AND** the sequence root SHALL NOT swallow the step projection.
