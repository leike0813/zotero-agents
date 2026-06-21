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

## ADDED Requirements

### Requirement: SkillRunner HTTP requests MUST use governed connection lanes

SkillRunner provider and management HTTP calls SHALL use application-level
connection governance instead of relying on implicit browser connection pools.

#### Scenario: submit requests keep priority

- **WHEN** SkillRunner creates or uploads a backend job
- **THEN** those requests SHALL run in the `submit` lane
- **AND** background, maintenance, and stream work SHALL NOT consume the final
  submit-reserved backend slot

#### Scenario: pre-ready dispatch failure is not recoverable

- **WHEN** `/v1/jobs` has returned a request id but upload or request
  initialization fails before `request-ready`
- **THEN** the provider dispatch SHALL fail the workflow job
- **AND** the job SHALL NOT be reported as a recoverable backend-owned pending
  run
- **AND** runtime logs SHALL include the request id and a pre-ready failure
  stage for audit

#### Scenario: submit requests are bounded by timeout

- **WHEN** SkillRunner create or upload does not complete
- **THEN** the submit request SHALL be aborted by a bounded request timeout
- **AND** the workflow job SHALL settle failed rather than remaining silently
  in-flight

#### Scenario: terminal settlement uses settlement lane

- **WHEN** SkillRunner terminal success requires `/result` or `/bundle`
- **THEN** result and bundle requests SHALL run in the `settlement` lane
- **AND** settlement failure SHALL NOT block later submit requests

#### Scenario: UI chat streams use a bounded stream pool

- **WHEN** RunDialog opens `/chat` SSE for SkillRunner runs on one backend
- **THEN** those streams SHALL run in the `foreground-stream` lane
- **AND** no more than two distinct request ids SHALL hold active foreground
  streams for that backend

### Requirement: SkillRunner SSE parsing MUST support standard frame endings

SkillRunner management SSE parsing SHALL handle both LF and CRLF empty-line
frame boundaries.

#### Scenario: CRLF-delimited frames are emitted

- **WHEN** a SkillRunner SSE response uses `\r\n\r\n` between frames
- **THEN** the management client SHALL emit each frame without waiting for the
  stream to close
- **AND** aborting the stream SHALL release the governed connection slot

### Requirement: SkillRunner provider dispatch MUST stop at request-ready

SkillRunner provider execution SHALL create and initialize the backend request,
then hand post-ready work to reconciler-owned settlement.

#### Scenario: upload success returns deferred without foreground polling

- **WHEN** `/v1/jobs` returns a request id
- **AND** the upload or initialization request succeeds
- **THEN** the provider SHALL record a `request-ready` SkillRunner run
- **AND** it SHALL return a deferred provider result
- **AND** it SHALL NOT poll `/v1/jobs/{requestId}`
- **AND** it SHALL NOT fetch `/result` or `/bundle`

#### Scenario: pre-ready failure remains foreground terminal

- **WHEN** create, upload, or initialization fails before `request-ready`
- **THEN** the provider SHALL fail the workflow dispatch
- **AND** no user-visible SkillRunner run projection SHALL be created
- **AND** runtime diagnostics SHALL include the stage and request id when one
  exists

#### Scenario: request-ready run is registered for settlement

- **WHEN** a SkillRunner request reaches `request-ready`
- **THEN** plugin SHALL register the run for reconciler-owned terminal
  settlement
- **AND** foreground provider code SHALL NOT own apply, retry, or sequence
  continuation for that run

### Requirement: SkillRunner post-ready errors MUST be classified by run scope

SkillRunner HTTP failures after `request-ready` SHALL distinguish terminal
run-level client errors from backend-level recoverable failures.

#### Scenario: run-level client error fails only current run

- **WHEN** post-ready state, result, bundle, or interaction requests return
  `400`, `404`, `410`, or `422`
- **THEN** plugin SHALL settle the affected SkillRunner run as failed
- **AND** it SHALL NOT mark the whole backend unreachable

#### Scenario: recoverable backend failure preserves submit availability

- **WHEN** post-ready state, result, bundle, or interaction requests fail with a
  network error, timeout, `429`, or `5xx`
- **THEN** plugin MAY use retry, backoff, or backend-health handling
- **AND** later submit/create/upload requests SHALL remain able to run

### Requirement: SkillRunner connection governance MUST separate reconcile and health lanes

SkillRunner HTTP work SHALL route terminal state polling and backend health
probing through separate governed lanes.

#### Scenario: terminal polling uses reconcile lane

- **WHEN** the frontend checks `/v1/jobs/{request_id}` for an already registered
  SkillRunner run
- **THEN** the request SHALL run in the `reconcile` lane
- **AND** the request SHALL use a bounded timeout
- **AND** it SHALL NOT share the `background` lane used by non-critical history
  or gap sync

#### Scenario: health probe uses health lane

- **WHEN** the frontend probes backend reachability with `/v1/system/ping`
- **THEN** the request SHALL run in the `health` lane
- **AND** health lane queueing or skipping SHALL NOT by itself mark an active
  run failed
- **AND** health lane failure SHALL NOT consume critical submit, settlement, or
  reconcile capacity

### Requirement: SkillRunner backend connection budget MUST protect critical lanes

The SkillRunner connection governor SHALL keep submit, settlement, and reconcile
work able to start under normal UI stream load.

#### Scenario: backend active cap is six

- **WHEN** SkillRunner work is scheduled for one backend
- **THEN** the default plugin-side active connection cap SHALL be six

#### Scenario: critical lane may evict warm stream

- **WHEN** a backend is at its active connection cap
- **AND** a `submit`, `settlement`, or `reconcile` task is queued
- **AND** an evictable warm foreground stream exists
- **THEN** the governor SHALL abort the least-recently focused evictable stream
- **AND** it SHALL start the critical task instead of waiting for background or
  stream work to finish

#### Scenario: low-priority lanes reserve budget

- **WHEN** `background`, `maintenance`, or `health` work is queued
- **THEN** that work SHALL leave at least two backend slots available for
  critical lanes

### Requirement: SkillRunner provider dispatch MUST preserve critical request paths under local transport pressure

SkillRunner submit, settlement, and request-level reconcile MUST NOT be blocked by idle reachability probing.

#### Scenario: prompt reconcile does not wait for reachability probe

- **WHEN** a SkillRunner request is registered for post-dispatch settlement
- **AND** the backend is due for reachability recovery probing
- **THEN** plugin SHALL reconcile the request directly without first awaiting the reachability probe
- **AND** a successful reconcile response SHALL mark the backend reachable.

#### Scenario: non-reachability timeout is inconclusive

- **WHEN** a `reconcile`, `background`, or `foreground-query` request times out
- **THEN** plugin SHALL record local transport pressure or request backoff
- **AND** plugin SHALL NOT mark the backend unreachable from that timeout alone.

#### Scenario: run-level terminal client error remains run-scoped

- **WHEN** a known SkillRunner request returns `400`, `404`, `410`, or `422`
- **THEN** plugin SHALL settle only that run as failed
- **AND** plugin SHALL NOT mark backend reachability failed.

## ADDED Requirements

### Requirement: SkillRunner Pre-Request Run Projection

SkillRunner provider dispatch MUST create or update a local projectable run
record before the backend `request_id` is available.

#### Scenario: local dispatch starts before request id exists
- **WHEN** a SkillRunner job starts provider dispatch
- **THEN** a local run record exists with no backend `request_id`
- **AND** it is projected as a visible active task
- **AND** it is not registered for backend settlement.

#### Scenario: request id is assigned
- **WHEN** `POST /v1/jobs` returns `request_id`
- **THEN** the existing local run record is updated with that `request_id`
- **AND** a second run record is not created.

#### Scenario: upload succeeds
- **WHEN** upload succeeds after create
- **THEN** the run reaches `request_ready`
- **AND** settlement/reconcile registration follows the existing post-ready path.

#### Scenario: pre-ready failure
- **WHEN** create or upload fails before request-ready
- **THEN** the local run record is failed with structured error/audit metadata
- **AND** no backend stream, history sync, pending poll, or settlement context is registered.

## ADDED Requirements

### Requirement: SkillRunner provider terminal and waiting ownership

The SkillRunner provider SHALL own normal `skillrunner.job.v1` foreground
settlement after `request-ready`.

#### Scenario: Terminal success is fetched before provider completion

- **WHEN** a SkillRunner job reaches `succeeded`
- **THEN** provider execution SHALL fetch `/result` or `/bundle`
- **AND** return a terminal success result that is ready for foreground
  `applyResult`.

#### Scenario: Backend terminal failure remains local terminal failure

- **WHEN** a SkillRunner job reaches `failed` or `canceled`
- **THEN** provider execution SHALL return the matching local terminal outcome
- **AND** foreground apply SHALL NOT run.

#### Scenario: Waiting detaches without timeout failure

- **WHEN** polling observes `waiting_user` or `waiting_auth`
- **THEN** provider execution SHALL return a foreground-owned deferred result
  with waiting metadata
- **AND** `poll.timeout_ms` SHALL NOT convert that waiting state to failure.
- **AND** the deferred result SHALL NOT include a separate `frontendStatus`
  request-ready marker.

### Requirement: Pre-ready failures are terminal local failures

Failures before `request-ready` SHALL fail the local workflow job instead of
creating background reconciler ownership.

#### Scenario: Submit or upload timeout happens before request-ready

- **WHEN** create or upload fails before the projectable run is ready
- **THEN** the job SHALL be marked failed locally
- **AND** no missing-context reconciler scan SHALL be required to settle it.

## ADDED Requirements

### Requirement: Provider adapter receives backend execution mode unchanged

Provider adapters SHALL continue using backend `runtime_options.execution_mode`
after workflow runtime normalization.

#### Scenario: Skill-level mode reaches SkillRunner backend wire shape

- **GIVEN** a workflow declares skill-level `mode`
- **WHEN** the provider adapter dispatches the request
- **THEN** the backend payload SHALL carry the same value in
  `runtime_options.execution_mode`
- **AND** no workflow-level mode field SHALL be required by the adapter.

### Requirement: Backend type values MUST be governed before provider resolution

The system MUST treat backend type as a closed runtime contract whose valid values are `skillrunner`, `acp`, `generic-http`, and `pass-through`.

#### Scenario: Valid backend type is loaded

- **WHEN** backend registry normalization reads a backend entry whose `type` is one of the governed backend type values
- **THEN** the normalized backend SHALL preserve that type as the provider dispatch backend type
- **AND** provider resolution SHALL continue to use `requestKind + backend.type`.

#### Scenario: Unknown backend type is rejected

- **WHEN** backend registry normalization reads a backend entry whose `type` is not one of the governed backend type values
- **THEN** the entry SHALL be reported as an invalid backend
- **AND** the entry SHALL NOT be returned by backend listing or provider resolution APIs.

#### Scenario: Invalid backend type does not make registry fatal

- **WHEN** at least one backend entry has an unknown type and at least one other backend entry is valid
- **THEN** backend registry loading SHALL return the valid backend entries
- **AND** the unknown-type backend SHALL be available through invalid-backend diagnostics.
