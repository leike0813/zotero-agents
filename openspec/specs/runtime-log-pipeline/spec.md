# runtime-log-pipeline Specification

## Purpose
TBD - created by archiving change add-plugin-log-system. Update Purpose after archive.
## Requirements
### Requirement: Runtime Log Pipeline SHALL Record Structured Entries In Memory
The system SHALL provide a centralized in-memory pipeline that records plugin runtime logs as structured entries with correlation context and diagnostic metadata.

#### Scenario: Append a normal workflow entry
- **WHEN** a workflow lifecycle event is emitted
- **THEN** the pipeline SHALL append one entry containing timestamp, level, scope, stage, message, and available context IDs (`backendId/backendType/providerId/workflowId/runId/jobId/requestId/interactionId`)

#### Scenario: Append a transport-aware entry
- **WHEN** provider/client/queue/reconciler emits network or transport boundary logs
- **THEN** the pipeline SHALL persist transport summary fields (`method/url/path/status/duration/retry/size/stepId`) when provided
- **AND** missing transport fields SHALL remain optional without rejecting the entry

### Requirement: Runtime Log Pipeline SHALL Instrument Trigger-Level and Job-Level Execution Boundaries
Runtime log 管道 MUST 为 Dashboard 与诊断导出提供可按 request/job/run 聚合的执行边界日志，覆盖全 provider 执行链路。

#### Scenario: 按 requestId 过滤日志
- **WHEN** Dashboard backend 详情页指定 `requestId`
- **THEN** 系统 SHALL 返回仅属于该 request 的日志条目

#### Scenario: 按 jobId/workflowId 组合过滤日志
- **WHEN** Dashboard backend 详情页指定 `jobId` 或 `workflowId`
- **THEN** 系统 SHALL 返回满足过滤条件的日志条目
- **AND** 过滤结果可用于 Generic HTTP backend 任务详情页展示

#### Scenario: Cross-provider chain instrumentation
- **WHEN** SkillRunner、generic-http、pass-through 任一 provider 执行成功或失败
- **THEN** 系统 MUST 记录可关联到 request/job 的边界日志（dispatch/transport/retry/terminal）

### Requirement: Runtime Log Pipeline SHALL Default to Recording info/warn/error and Not Record debug by Default
The default runtime write policy SHALL record `info`, `warn`, and `error` levels while excluding `debug` unless diagnostic collection is explicitly enabled.

#### Scenario: Debug entry under default policy
- **WHEN** a debug-level write is attempted under default settings
- **THEN** the pipeline SHALL ignore it and keep stored entries unchanged

#### Scenario: Error entry under default policy
- **WHEN** an error-level write is attempted under default settings
- **THEN** the pipeline SHALL store the entry successfully

### Requirement: Runtime Log Pipeline SHALL Redact Sensitive Auth Data Before Storage
The system MUST prevent known secret-bearing fields from being persisted in runtime logs.

#### Scenario: Authorization header present in details
- **WHEN** a log entry includes auth header/token fields in details
- **THEN** the stored entry SHALL replace sensitive values with redacted placeholders

### Requirement: Generic HTTP dashboard logs MUST bind to explicitly selected task
系统 MUST 让 Generic HTTP backend 的日志面板绑定到用户显式选择的任务，不得在同 backend 新任务到达时自动切换目标。

#### Scenario: same backend receives a new task while viewing logs
- **WHEN** 用户正在查看某 backend 某任务的日志
- **AND** 同 backend 新任务开始执行
- **THEN** 日志面板 MUST 继续显示原绑定任务日志
- **AND** 仅在用户主动选择新任务后才切换日志目标

### Requirement: Generic HTTP dashboard logs MUST expose structured details drawer
系统 MUST 在 Generic HTTP backend 页面展示结构化日志详情抽屉，用于查看 scope/stage/workflowId/requestId/jobId/details/error 等信息。

#### Scenario: open log detail drawer
- **WHEN** 用户点击日志表中的某条日志
- **THEN** 页面 MUST 打开或更新日志详情抽屉
- **AND** 抽屉 MUST 展示该日志条目的结构化 payload

### Requirement: Runtime Log Pipeline SHALL Support Session Diagnostic Mode
The pipeline MUST expose a session-level diagnostic mode switch that controls logging granularity.

#### Scenario: Diagnostic mode disabled
- **WHEN** diagnostic mode is disabled
- **THEN** pipeline SHALL keep default low-noise policy (info/warn/error by default)
- **AND** debug-only transport details SHALL NOT be emitted unless explicitly enabled

#### Scenario: Diagnostic mode enabled
- **WHEN** diagnostic mode is enabled
- **THEN** pipeline SHALL allow fine-grained debug entries and transport diagnostics for provider/client/reconciler boundaries

### Requirement: Runtime Log Pipeline SHALL Normalize Error Classification and Cause Summary
The pipeline MUST classify runtime failures into stable categories and preserve structured cause summaries.

#### Scenario: Normalize categorized errors
- **WHEN** an error is captured in provider/client/hook/reconciler paths
- **THEN** the stored log details SHALL include normalized category (`network|timeout|auth|validation|provider|hook|unknown`)
- **AND** a sanitized cause summary SHALL be retained for triage

### Requirement: Runtime Log Pipeline SHALL Build RuntimeDiagnosticBundleV1
The pipeline MUST support exporting a machine-consumable diagnostic bundle from retained logs.

#### Scenario: Build diagnostic bundle with filters
- **WHEN** caller requests diagnostic export with filters and time window
- **THEN** system SHALL output `RuntimeDiagnosticBundleV1` JSON with `meta`, `filters`, `timeline`, `incidents`, and `entries`
- **AND** `timeline` SHALL be time-ordered and `incidents` SHALL summarize first-failure/retry/terminal chain per request/job context

### Requirement: Runtime log pipeline MUST persist logs through runtime persistence files

The runtime log pipeline MUST use runtime persistence files as the durable storage path for retained log documents after migration from prefs, and every production hydration and persistence operation MUST use Zotero-compatible asynchronous file APIs.

#### Scenario: Runtime log flush writes file storage

- **WHEN** retained runtime logs are flushed for persistence
- **THEN** the runtime log document SHALL be written through runtime persistence file storage
- **AND** the flush SHALL NOT resolve before the latest revision observed by its active drain is durably replaced
- **AND** the legacy `runtimeLogsJson` pref SHALL NOT remain the primary stored copy.

#### Scenario: Legacy prefs data is migrated

- **WHEN** runtime log hydration finds no runtime log file but finds valid legacy `runtimeLogsJson` pref data
- **THEN** the pipeline SHALL hydrate retained logs from the pref data
- **AND** persistence SHALL write the migrated document to runtime persistence file storage
- **AND** the legacy pref SHALL be cleared only after that write succeeds.

#### Scenario: Existing file cannot be hydrated

- **WHEN** runtime log file reading or parsing fails during explicit initialization
- **THEN** the pipeline SHALL leave the existing file unchanged
- **AND** it SHALL continue with an empty in-memory state and recorded persistence failure accounting.

#### Scenario: Log listing does not require prefs storage

- **WHEN** runtime logs have been flushed to runtime persistence files
- **THEN** log listing and diagnostic bundle creation SHALL read the retained in-memory state
- **AND** they SHALL NOT require `runtimeLogsJson` to contain the retained entries
- **AND** they SHALL NOT implicitly write persistence state.

### Requirement: Runtime log persistence MUST serialize retained entries once

The runtime log pipeline MUST use each accepted sanitized entry's single serialized representation as the persisted entry payload and byte-budget source of truth.

#### Scenario: Append retains a sanitized entry

- **WHEN** a sanitized runtime log entry is accepted
- **THEN** the pipeline SHALL serialize that entry once
- **AND** retention accounting and later document persistence SHALL reuse the cached serialization without serializing or deep-copying the entry again.

### Requirement: Runtime log persistence MUST order dirty revisions through one writer

The runtime log pipeline MUST allow no more than one retained-document save in flight, MUST preserve dirty state after a failed save, and MUST eventually save revisions created during an active write.

#### Scenario: Burst appends become dirty

- **WHEN** multiple entries are appended within the idle debounce window
- **THEN** the pipeline SHALL coalesce them behind one scheduled drain
- **AND** a continuous dirty burst SHALL be offered to persistence no later than the configured maximum-delay boundary.

#### Scenario: Entry arrives during a save

- **WHEN** a newer revision is created while an earlier revision is being written
- **THEN** no concurrent retained-document save SHALL start
- **AND** the active drain SHALL persist a subsequent document through the newer revision.

#### Scenario: Save fails

- **WHEN** atomic replacement of a dirty revision fails
- **THEN** the failure SHALL NOT be thrown into the runtime-log producer's business path
- **AND** the revision SHALL remain dirty so a later flush can retry it.

#### Scenario: Explicit flush or shutdown

- **WHEN** an explicit flush, clear, or shutdown drain begins
- **THEN** pending debounce timers SHALL be cancelled
- **AND** the caller SHALL be able to await completion of the required persistence drain.

### Requirement: Runtime log documents MUST use bounded atomic replacement

Runtime log documents MUST be emitted as bounded text chunks to a temporary file in the target directory and MUST replace the target only after all chunks are written successfully.

#### Scenario: Large document is persisted

- **WHEN** a retained document exceeds the physical append limit
- **THEN** its prefix, cached serialized entries, separators, and suffix SHALL be emitted in order
- **AND** no physical append SHALL exceed the surrogate-safe 256 KiB policy
- **AND** the complete document SHALL preserve the existing JSON schema and Unicode content.

#### Scenario: Chunk append fails before replacement

- **WHEN** any temporary-file append fails before the replace step
- **THEN** the existing target SHALL remain unchanged
- **AND** the temporary file SHALL be removed on a best-effort basis.

#### Scenario: All chunks succeed

- **WHEN** every temporary-file chunk is written successfully
- **THEN** the temporary file SHALL atomically replace the target
- **AND** no successful-operation temporary file SHALL remain.

### Requirement: Runtime log observation MUST avoid full snapshots on update paths

Runtime log append notifications and routine Runtime Logs UI refreshes MUST expose only the entry and aggregate data needed by their consumers.

#### Scenario: Listener observes an append or clear

- **WHEN** the retained log state changes
- **THEN** each listener SHALL receive a lightweight change event with revision and change metadata
- **AND** the event SHALL NOT contain a complete runtime-log snapshot.

#### Scenario: Runtime Logs page refreshes

- **WHEN** Task Manager refreshes the Runtime Logs page
- **THEN** it SHALL read aggregate summary data and at most 300 visible entries
- **AND** the refresh SHALL NOT construct a complete `RuntimeLogSnapshot`.

### Requirement: Runtime log cleanup MUST drain pending persistence first

Runtime persistence cleanup MUST await pending runtime-log save or clear work before removing the logs category storage.

#### Scenario: Logs category is cleared during a pending save

- **WHEN** logs-category cleanup starts while runtime-log persistence is in flight
- **THEN** cleanup SHALL await the registered asynchronous runtime-log clearer
- **AND** no late runtime-log write SHALL recreate the deleted directory after cleanup completes.

### Requirement: Runtime Log Pipeline SHALL Cover Backend Cache Refresh Diagnostics

The runtime log pipeline SHALL record high-signal backend cache refresh events for issue diagnostics.

#### Scenario: ACP runtime options refresh

- **WHEN** an ACP backend runtime options refresh starts, succeeds, or fails
- **THEN** the system SHALL append structured runtime logs with backend identity, operation, stage, workspace/runtime path summaries, cache counts when available, and sanitized error details.

#### Scenario: SkillRunner model cache refresh

- **WHEN** a SkillRunner model cache refresh starts, succeeds, or fails
- **THEN** the system SHALL append structured runtime logs with backend identity, operation, request path summaries, engine/model counts when available, duration when available, and sanitized error details.

