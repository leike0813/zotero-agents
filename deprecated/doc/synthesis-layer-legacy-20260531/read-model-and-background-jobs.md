# Synthesis Snapshot 与后台任务

## 目的

本文档定义 Synthesis 的 read-path 和 background-job 边界。规则很简单：read 只观察已有状态；mutation 和 worker 才改变状态。Read 不得 rebuild、migrate、enqueue 或扫描冷路径资产。

本文件中的 snapshot / DTO 指普通 API 调用从 committed SQLite state 组装出的有界返回值；它不是 CQRS read model，不是第二套 canonical state，也不是需要独立同步的物化投影。

Status: `mostly implemented`。Workbench snapshot、DB-backed jobs 和 startup reconcile 主路径已建立；完整 epoch/basis diagnostics、worker progress coverage 和 interrupted-run cleanup 仍是后续 gate。

## 读路径纯度（Read-Path Purity）

Workbench、MCP 和 Host Bridge read APIs 必须：

- 组装有界 DB-backed snapshot DTO；
- 在数据缺失或过期时返回 diagnostics 和 recommended commands；
- 遵守 [Performance and Scale Model](./performance-scale-model.md) 中的 UI read budgets、分页上限和 truncation 规则；
- 避免在普通 UI 路径扫描 JSON canonical files；
- 避免触发 rebuilds、imports、source checks/freshness scans、discovery matching、graph layout 或 complex metrics computation。

当前实现锚点：

- `src/modules/synthesis/service.ts`
  - `getSynthesisSnapshotInput`
  - `getSynthesisSnapshot`
  - registry、topic、graph、concept、tag 和 maintenance snapshot assembly
- `src/modules/synthesis/uiModel.ts`
  - `buildSynthesisUiSnapshot`
  - `normalizeSynthesisUiSnapshot`
- `src/modules/synthesis/mcpService.ts`

Workbench snapshot 应保持为轻量 DTO，包含：

- active tab summaries；
- bounded table rows：默认 page size 50，上限 100；
- 每个领域至多一张 current review card 或有界 review rows；
- requested graph slices，而不是 full graph rebuilds；默认 graph snapshot 目标 p95 为 750 ms；
- background job summary；
- diagnostics 和 recommended commands。

Snapshot assembly 目标 p95 为 500 ms。超过预算的 read path 应返回 bounded diagnostics 或 delayed section，而不是同步执行长查询。

## 脏事件（Dirty Events）

自动工作由 mutation events 触发，而不是由 reads 触发。有效来源包括 Zotero item changes、literature digest apply、paper artifact changes、topic synthesis apply、concept/topic/tag review actions，以及显式 rebuild、source check 或 retry commands。Registry cache dirty events 不应 fan out 成 topic source-check / freshness diagnostic work。

旧 `reference_matching_applied` 事件只属于 legacy reference matching workflow 的兼容残留；新的 Synthesis reference resolution 不应把它作为正式触发器。References artifact 变化应归入 `paper_artifact_changed` / `digest_applied`，用户确认 reference resolution 应归入对应 review/action 触发。

Dirty events 是临时工作队列状态，不是 event sourcing 日志。系统不提供全局事件重放能力；需要恢复时应从 Zotero library、artifact notes、committed DB facts 和显式 checkpoint/import 输入重新计算。

Matched library citation edges 可以触发 Zotero related items 外部 sync，但该 sync 仍属于 mutation/worker 路径：它只补缺失的 Zotero native related link，不读取旧 `reference-matching` baseline，不把 Zotero related items 作为 Citation Graph 或 reference resolution 的输入事实。

Dirty events 属于 SQLite 运行态，应包含：

- event type；
- source；
- scope kind 与 scope reference；
- source hash；
- status；
- attempt count；
- next retry timestamp；
- diagnostics；
- created 与 updated timestamps。

Events 应按有意义的 scope 合并：paper、literature item、topic、graph preset 或类似的有界单元。

当前实现锚点：

- `src/modules/synthesis/updateEvents.ts`
  - `createSynthesisUpdateEventStore`
  - event normalization and queue derivation
- `src/modules/synthesis/repository.ts`
  - `upsertDirtyEvent`
  - dirty event listing and mutation helpers
- `src/modules/synthesis/itemObserver.ts`

## 后台任务（Background Jobs）

Background jobs 在显式预算下消费 dirty events：

- batch size limit；
- time budget；
- pause/resume；
- retry and backoff；
- latest failure diagnostics；
- measured progress where possible。

默认预算来自 [Performance and Scale Model](./performance-scale-model.md)：

| Worker | 默认 batch/time budget |
| --- | --- |
| Paper registry incremental | 25 papers 或 2000 ms |
| Startup reconcile fingerprint scan | 500 Zotero items 或 2000 ms |
| Citation graph structure | 1000 reference instances 或 2000 ms |
| Citation graph layout | 2000 default graph nodes 或 3000 ms |
| Zotero related items sync | 100 matched library edges 或 2000 ms |
| Topic discovery repair | 500 topic-literature pairs 或 2000 ms |

Unsafe scope 必须变成 stale state 加 recommended repair command。Worker 不得因为有界更新困难就静默 fallback 到 full rebuild。

Zotero related items sync worker 是外部副作用 worker。它应在 registry/reference/citation facts commit 后读取已匹配的库内 citation edges，按候选 edge 数报告真实进度，并把 Zotero 写入失败限制在该 sync job 的 diagnostics 内，不回滚 DB facts。

当前 job-state 锚点：

- `src/modules/synthesis/repository.ts`
  - `upsertJobProgress`
  - `completeJobProgress`
  - `failJobProgress`
  - `listActiveJobProgress`
  - `clearStaleJobProgress`
- `src/modules/synthesis/service.ts`
  - `buildMaintenanceBackgroundJobs`
  - `reportJobProgress`
  - `withSynthesisJobProgress`
- `src/modules/synthesis/jobProfiler.ts`

## 进度报告（Progress Reporting）

Statusbar/popover snapshot 应优先使用 DB-backed `synt_job_state` progress records。只有当不存在更具体的 job progress row 时，才可以展示 fallback queue aggregate。

Progress 必须诚实：

- determinate progress 需要已知 `current/total` 或显式 phase count；
- 只有当 phases 固定且具备 label 时，phase progress 才能是 determinate；
- 未知工作量保持 indeterminate；
- frontend in-flight actions 可以显示 submitted/running local rows，但 backend job progress 存在时以 backend 为准。

当前 UI 锚点：

- `src/modules/synthesis/uiModel.ts`
  - `SynthesisUiBackgroundJobRow`
  - `SynthesisUiBackgroundJobSummary`
- `src/synthesisWorkbenchApp.ts`
  - action statusbar and job popover rendering

## 启动收敛（Startup Reconcile）

Startup reconcile 必须比较当前 Zotero fingerprints 与 DB state。它不得初始化或读取 canonical JSON registry files 作为运行事实源。

Startup reconcile 是 bounded detector，不是 unbounded impact executor：

- 小规模且安全的 Zotero drift 可以转为 bounded dirty events。默认阈值：变更数 <= 50 且 <= 5% active library，decode failure ratio < 2%。
- Bulk drift 应记录 bounded source drift incident，并推荐显式 registry/graph cache rebuild。默认阈值：变更数 > 50 或 > 5%，或批量 merge/delete/update。
- Structural drift 应 fail-closed，暂停增量 fan-out，并要求 inspect/repair。默认触发：binding collision、结构异常、decode failure ratio >= 2%、fingerprint scan hard timeout 或 Zotero API/DB 不一致。
- Bulk/structural drift 不得展开为大量 active jobs、review rows、graph jobs 或 topic source-check/discovery work。

在 new-install 或 reset 后的运行态中，startup reconcile 应稳定为 ready 或 empty queue state。Legacy `plugin_task_rows` 或 `data/synthesis/**` 残留不得产生用户可见的 queued Synthesis jobs。

## 调试 Profiler

Job profiler 仅供开发使用：

- 只通过现有 debug mode 启用；
- 不提供用户 UI 或 prefs 入口；
- 使用 `state/debug/` 下的独立 DB；
- 不参与 checkpoint/export/Git Sync；
- profiler 初始化失败不得影响业务。

Profiler data 用于解释性能失败，不是 Workbench job progress 来源。
