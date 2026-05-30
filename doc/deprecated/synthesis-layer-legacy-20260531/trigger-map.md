# Synthesis Layer 触发器地图

本文档记录当前 Synthesis layer 中会触发持久化、索引、后台任务、UI snapshot 或 workflow apply 的入口。它描述最新实现的触发边界，并服务于后续开发计划。

Status: `partial` / `transitional`。本地图反映当前可见触发表面，其中部分入口仍保留 legacy fallback 或 transitional worker；canonical 目标以各领域合同为准。

相关设计锚点：

- [持久化与状态](./persistence-state.md)
- [领域与动作边界](./domain-action-boundaries.md)
- [读模型与后台任务](./read-model-and-background-jobs.md)
- [Workflow 与 Artifact 合同](./workflow-artifact-contracts.md)

## 阅读方式与术语

- **热路径**：普通 Workbench、MCP、Host Bridge read API。热路径默认读取 SQLite-backed view model，不隐式扫描旧 JSON。
- **冷路径**：显式 import/export/checkpoint/detail-read/audit。`data/synthesis/**` 可继续存在，但不能作为普通列表页、任务状态、update queue 的隐式 fallback。
- **mutation trigger**：会改变 Synthesis 领域事实或 runtime state 的入口。
- **read trigger**：只读取已有状态，返回有界 DTO、diagnostics 和 recommended commands。
- **background trigger**：显式 worker、startup reconcile 或 dirty queue consumer。

## 总览矩阵

| 域 | 触发器 | 入口 | 当前事实源/写入 | 热路径边界 |
| --- | --- | --- | --- | --- |
| Topic synthesis | workflow apply | `applyTopicSynthesisResult` | 写 topic current JSON；摄取 topic graph/concept/topic interest DB state | UI 正常列表读 DB/topic graph view，不从旧 index fallback |
| Concept KB | proposal ingestion | topic synthesis apply -> `conceptKb.ingestConceptCardProposals` | SQLite concept/review state | 不写 JSON 热路径 |
| Topic Graph | materialized topic/relation proposal ingestion | topic synthesis apply -> `topicGraph.*` | SQLite topic graph nodes/edges/review items | Paper registry worker 不自动改语义关系 |
| Topic interest metadata | sidecar ingestion | topic synthesis apply -> `upsertTopicInterestMetadata` | SQLite topic interest metadata | 不进入 topic artifact 正文；不回扫旧 literature |
| Tag Vocabulary | save/import | `saveTagVocabulary` / `applyTagVocabularyImport` | SQLite tag vocabulary state；导出保持协议兼容 | active UI 读 DB |
| Paper Registry Cache | digest/reference/Zotero events | `recordSynthesisUpdateEvent` / Zotero observer | `synt_dirty_event` + repository state | read API 不 enqueue worker；不是全局 Synthesis SSOT；历史实现名包括 Literature Registry |
| Citation Graph | structure/metrics/layout workers | `runCitationGraph*Worker` | SQLite citation graph rows；complex/layout 可滞后 | read API 返回 bounded slice/metrics |
| Zotero related items sync | graph-to-library maintenance worker | related-items sync dirty / explicit maintenance command | Zotero native related links；DB 只记录 job/diagnostics | 只补缺失 related link，不作为 graph 事实源 |
| Topic source check / discovery | explicit check / digest apply-time match | source-check command / literature-digest apply matcher | SQLite topic metadata、hints、source-check diagnostics | hint 不自动改写 topic；普通路径不做全库 discovery；registry cache 不驱动 topic check |
| Background jobs | queue/progress | workers + `synt_job_state` | SQLite job progress | statusbar/popover 优先 DB job progress |
| Workbench snapshot | open/refresh | `getSynthesisSnapshot` | bounded DB-backed snapshot input | 不迁移、不 rebuild、不扫描旧 JSON |
| MCP / Host Bridge reads | read-only tools | `synthesis.*` tools/capabilities | Synthesis service read facade | 只读、有界、返回 diagnostics |

## Workflow / Topic Synthesis Triggers

### Trigger：Topic synthesis apply

- **触发条件**：`create-topic-synthesis` 或 `update-topic-synthesis` workflow 完成，host hook 调用 `runtime.hostApi.synthesis.applyTopicSynthesisResult`。
- **入口**：`SynthesisService.applyTopicSynthesisResult`。
- **当前行为**：
  - 校验 result bundle。
  - 读取 `analysis_manifest_path` 指向的 complete/patch manifest。
  - 通过 manifest `sidecars` 读取三类 sidecar；旧顶层 sidecar path 字段只作为 legacy fallback。
  - 校验并 assemble/patch structured topic artifact。
  - 写入 topic current JSON、section JSON、metadata 和 export markdown，作为 canonical/cold-path 资产。
  - 更新 topic definitions、resolvers、resolved paper sets；兼容 index 文件只属于 legacy/cold-path 过渡，不是 Workbench 热路径事实源。
  - 摄取 Concept KB proposal、Topic Graph relation proposal、Topic interest metadata 到 SQLite-backed runtime state。
  - 写入 topic source manifest baseline / current topic context。
- **不会做的事**：
  - 不把 topic interest metadata 插入 artifact 正文。
  - 不因为普通 UI 读取而重新运行 apply。
  - 不把旧顶层 sidecar path 作为新合同。
- **代码锚点**：
  - `src/modules/synthesis/service.ts`
  - `src/modules/synthesis/workflow.ts`
  - `src/modules/synthesis/topicStructuredArtifact.ts`

### Trigger：Concept card proposal ingestion

- **触发条件**：topic synthesis apply 成功读取 manifest sidecar `sidecars.concept_cards_proposal.path`。
- **入口**：`conceptKb.ingestConceptCardProposals`。
- **写入结果**：SQLite Concept KB records、aliases、relations、topic links 和 review items。
- **边界**：
  - 旧 bundle 字段 `concept_cards_proposal_path` 仅为 legacy fallback。
  - JSON concept assets 不是普通 UI 的热路径事实源。
- **代码锚点**：`service.ts`、`conceptKb.ts`、`repository.ts`。

### Trigger：Topic Graph relation proposal ingestion

- **触发条件**：topic synthesis apply 成功读取 manifest sidecar `sidecars.topic_graph_relation_proposals.path`。
- **入口**：`topicGraph.ingestRelationProposals`。
- **写入结果**：SQLite topic graph relation review items；同时 materialize 当前 topic node。
- **边界**：
  - Paper Registry 或 source-check worker 不自动确认、拒绝或改写 topic graph 语义关系。
  - 旧 bundle 字段 `topic_graph_relation_proposals_path` 仅为 legacy fallback。
- **代码锚点**：`service.ts`、`topicGraph.ts`、`repository.ts`。

### Trigger：Topic interest metadata ingestion

- **触发条件**：topic synthesis apply 成功读取 manifest sidecar `sidecars.topic_interest_metadata.path`。
- **入口**：`synthesisRepository.upsertTopicInterestMetadata`。
- **写入结果**：SQLite `synt_topic_interest_metadata`。
- **边界**：
  - 旧 bundle 字段 `topic_interest_metadata_path` 仅为 legacy fallback。
  - metadata 只服务 discovery，不是正文 section。
  - topic apply 不回扫旧 literature；新的 metadata 只影响之后的 literature-digest apply-time matching，或显式 debug/maintenance repair。
- **代码锚点**：`service.ts`、`repository.ts`。

## Tag / Concept / Topic Graph Triggers

### Trigger：Tag vocabulary save/import

- **触发条件**：用户保存 tag vocabulary，或执行 tag vocabulary import apply。
- **入口**：`SynthesisService.saveTagVocabulary`、`SynthesisService.applyTagVocabularyImport`。
- **写入结果**：SQLite tag vocabulary rows、aliases、abbreviations、protocol 和 validation warnings。
- **边界**：TagVocab JSON 形状只在 import/export/checkpoint 边界保持兼容；active UI 不应读 JSON 文件作为事实源。

### Trigger：Concept display edit / review action

- **触发条件**：用户在 Workbench 对 concept proposal 或 concept record 执行复检/编辑。
- **入口**：Synthesis service 的 concept review/action handler。
- **写入结果**：SQLite concept facts 与 review state。
- **边界**：成功动作应改变领域事实，而不只是隐藏 review item。

### Trigger：Topic Graph edge decision / review action

- **触发条件**：用户批准、拒绝或调整 topic graph relation proposal。
- **入口**：Synthesis service 的 topic graph review/action handler。
- **写入结果**：SQLite topic graph edge/review state。
- **边界**：topic graph review action 不应重写 topic artifact 正文。

### Trigger：Topic artifact delete

- **触发条件**：用户删除或 purge topic artifact。
- **入口**：`SynthesisService.deleteTopicArtifact`、purge 相关 handler。
- **写入结果**：topic graph/materialized topic state、deleted topic rows、freshness/visibility 状态按实现更新。
- **边界**：普通删除与 purge 应区分；旧 JSON 残留不得让 Home/Topics 热读重新显示已删除或未迁移 topic。

## Paper Registry Cache / Citation Graph Triggers

### Trigger：Paper registry read

- **触发条件**：Workbench Registry/Index tab、MCP、Host Bridge 调用 paper registry read。
- **入口**：`SynthesisService.getPaperRegistry`。
- **读取结果**：DB-backed literature item、binding、artifact、reference resolution view。
- **边界**：read 不 rebuild registry，不 enqueue dirty event，不扫描 canonical derived files。

### Trigger：Zotero item dirty event

- **触发条件**：Zotero item add/update/delete/restore notify。
- **入口**：hooks observer -> `recordSynthesisZoteroItemNotifications` -> `recordSynthesisUpdateEvent`。
- **写入结果**：repository-backed dirty event（`synt_dirty_event`）。
- **边界**：observer 只记录事件，不 inline rebuild registry 或 graph。

### Trigger：Literature digest / paper artifact dirty event

- **触发条件**：literature digest apply 完成，或 digest/references/citation-analysis 等 paper artifact note 发生变化。
- **入口**：对应 apply hook -> `recordSynthesisUpdateEvent`。
- **写入结果**：`synt_dirty_event`，必要时更新 matching metadata 或 artifact state。
- **边界**：
  - apply hook 不等待下游 worker 完成。
  - 旧 `reference_matching_applied` 只作为 legacy reference matching workflow 兼容残留存在，不是新的 Synthesis reference resolution 设计入口。
  - 新机制下 references artifact 变化应表达为 `paper_artifact_changed` / `digest_applied`；reference resolution review action 应使用对应 action/graph invalidation 语义。

### Trigger：Startup lightweight reconcile

- **触发条件**：插件启动后 Synthesis service 可用，或测试/host 显式调用 reconcile facade。
- **入口**：`SynthesisService.runSynthesisStartupReconcile`。
- **写入结果**：先分类 Zotero external source drift。小规模安全漂移可写入 bounded dirty events/job progress；bulk 或 structural drift 只写 bounded incident/diagnostic 和 recommended command。
- **边界**：
  - 不读取或初始化 canonical JSON registry 作为运行事实源。
  - 空 DB 或 reset 后状态应收敛为 ready/empty queue。
  - legacy `plugin_task_rows` 残留不得出现在 statusbar/popover。
  - bulk/structural drift 不逐条展开 deletion/rebuild/review fan-out。
  - 不触发 topic source check、freshness 或 discovery work。

### Trigger：Paper Registry incremental worker

- **触发条件**：显式 host command、queue consumer，或 recommended command 被用户执行。
- **入口**：`SynthesisService.runPaperRegistryIncrementalWorker`。
- **输入**：`synt_dirty_event` 中待处理的 paper/literature/Zotero scope events。
- **写入结果**：literature item/binding/artifact/reference facts，citation graph structure dirty signal，job progress。
- **边界**：worker 遵守 batch/time budget；unsafe scope 标 stale + recommended repair，不静默 full rebuild。
- **Topic 边界**：不因为 registry row、artifact hash 或 reference facts 变化而 enqueue topic source-check work。

### Trigger：Citation Graph structure worker

- **触发条件**：paper/reference/registry-cache 相关 dirty events 需要刷新 graph structure。
- **入口**：`SynthesisService.runCitationGraphStructureWorker`。
- **写入结果**：SQLite citation nodes、edges、source ownership、incoming groups、lightweight metrics。
- **边界**：structure 是 registry cache 的 DB-native derived state；普通 graph read 不触发 structure rebuild。

### Trigger：Citation Graph complex metrics worker

- **触发条件**：structure 变化后 complex metrics stale，或用户显式执行 recompute。
- **入口**：`SynthesisService.runCitationGraphComplexMetricsWorker`。
- **写入结果**：SQLite complex metrics 与 job progress。
- **边界**：complex metrics 可滞后；read API 返回当前状态和 diagnostics，不 inline 计算全图指标。

### Trigger：Citation Graph layout worker

- **触发条件**：Graph UI 打开、layout preset 切换或显式 manual recompute。
- **入口**：`SynthesisService.runCitationGraphLayoutWorker` 与 Workbench graph handler。
- **写入结果**：layout cache/state。
- **边界**：MCP、CLI 和普通 Workbench snapshot 不应触发布局计算。

### Trigger：Zotero native related items sync

- **触发条件**：citation graph structure 写入后发现库内 matched citation edges，reference resolution review action 把某个 reference 确认为 Zotero-bound target，或用户/debug/maintenance 显式请求同步。
- **入口**：目标 contract 为 related-items sync worker；实现应通过 Synthesis service 读取 citation graph/reference resolution facts，再通过 host Zotero API 补齐 parent related items。
- **输入**：SQLite citation graph edge / reference resolution rows；source 与 target 都必须有 active Zotero binding。
- **写入结果**：Zotero native related items。DB 只记录 job progress、diagnostics 和 bounded dirty event 状态，不把 related items 当作 graph SSOT。
- **边界**：
  - 不读取旧 `reference-matching` workflow 的 citeKey baseline 或 payload block。
  - 不因为 related items 中已有或缺失某条关系而改变 reference resolution / citation edge。
  - 只补缺失 related link，不自动删除用户手动维护的 related link。
  - 外部 Zotero API 写入失败只影响该 sync job，不回滚 registry cache 或 citation graph facts。
  - 普通 graph read、Workbench snapshot、MCP read-only tool 不触发该 sync。

### Trigger：Citation graph read-only tools

- **触发条件**：Workbench Graph、MCP 或 Host Bridge 请求 graph slice/metrics。
- **入口**：`getCitationGraphSlice`、`getCitationGraphMetrics`、`queryCitationGraph`。
- **读取结果**：bounded graph slice/metrics DTO。
- **边界**：不 rebuild graph，不计算 layout，不触发 worker。

## Topic Source Check / Discovery Triggers

### Trigger：Topic source check

- **触发条件**：用户在 Workbench/Host Bridge/debug 中显式请求检查 topic sources。
- **入口**：目标 contract 为 topic source-check command；当前实现仍可能复用 transitional freshness worker。
- **写入结果**：topic source manifest diagnostic / coverage check state。
- **边界**：
  - source check 与 discovery hint 分离。
  - discovery hint 不等于 topic usage。
  - check 不自动改写 topic artifact。
  - Registry cache rebuild、startup reconcile、registry dirty events 不触发 source check。

### Trigger：Digest apply-time discovery match

- **触发条件**：literature-digest apply 成功写入或更新该 literature 的 `literature_matching_metadata`。
- **入口**：digest apply / artifact ingest 后的 discovery matcher。
- **写入结果**：该 literature 与 active topics 的 bounded best-effort discovery hints。
- **边界**：
  - 只比较本次 apply 的单篇 literature 与 active topics。
  - 不因 topic apply、registry cache rebuild 或 ordinary Workbench read 做全库 discovery backscan。
  - 被用户 filtered 的 topic-literature pair 不因 digest 重跑或 metadata hash 微变自动重新打开。

## Background Job / Progress Triggers

### Trigger：Job progress update

- **触发条件**：worker 或后台流程调用 progress helper。
- **入口**：`reportJobProgress`、`withSynthesisJobProgress`、repository job methods。
- **写入结果**：`synt_job_state`。
- **边界**：
  - determinate progress 必须有真实 `current/total` 或固定 phase count。
  - 不可计算工作量显示 indeterminate。
  - debug-only `jobProfiler` 不是 UI progress 来源。

### Trigger：Synthesis database reset

- **触发条件**：Prefs 危险区按钮经双重确认调用 reset。
- **入口**：`resetSynthesisDatabase`。
- **写入结果**：清空 Synthesis `synt_*` runtime tables，保留 DB 文件和 schema meta；清理 legacy synthesis task scopes 作为卫生处理。
- **边界**：不删除 `data/synthesis/**`，不执行 import/migration。

## Git Sync Triggers

Git Sync 仍围绕 canonical/cold-path assets 工作。它不是 Workbench 热读事实源。

### Trigger：Canonical store changed notify

- **触发条件**：会写 canonical assets 的操作成功，并满足 autosync notify 条件。
- **入口**：`runCanonicalWriteWithAutosync` 相关路径。
- **结果**：记录 Git Sync debounce/maintenance state。
- **边界**：DB-only review/runtime state 不应因为普通读取触发 Git Sync。

### Trigger：Git Sync debounce worker / retry

- **触发条件**：autosync queue、explicit retry 或 maintenance command。
- **入口**：`gitSync.ts`、`gitSyncCommandAdapter.ts`。
- **结果**：sync state、conflict diagnostics、phase progress。
- **边界**：sync conflict resolution 是显式动作；普通 Workbench snapshot 只显示已有状态。

## Workbench / MCP / Host Bridge Triggers

### Trigger：Workbench initial snapshot and refresh

- **触发条件**：打开 Synthesis Workbench 或刷新。
- **入口**：`getSynthesisSnapshot` / `getSynthesisSnapshotInput` -> `buildSynthesisUiSnapshot`。
- **读取结果**：bounded UI DTO，包括 topic rows、registry rows、cleanup/review rows、graph slices、background jobs、diagnostics。
- **边界**：不迁移、不 rebuild、不 enqueue、不从旧 JSON 注入 Home/Topics/Cleanup rows。

### Trigger：Cached Workbench UI actions

- **触发条件**：排序、筛选、tab 切换、局部 UI 状态变化。
- **入口**：Workbench action handling 与 `uiModel`。
- **结果**：基于 cached snapshot input 重新组装 UI state。
- **边界**：不触发 service mutation。

### Trigger：Explicit Workbench host commands

- **触发条件**：用户点击 refresh/retry/recompute/import/export/reset 等明确命令。
- **入口**：`synthesisWorkbenchTab.ts` host command handling。
- **结果**：调用对应 service command 或 import/export/reset 入口。
- **边界**：只有显式命令能启动 worker、import/export/checkpoint 或 reset。

### Trigger：MCP read-only Synthesis tools

- **触发条件**：ACP/agent 调用 `synthesis.*` read tool。
- **入口**：`mcpService.ts` -> Synthesis service read facade。
- **读取结果**：bounded structuredContent。
- **边界**：read-only tools 不写 assets、不运行 resolver、不触发 agent synthesis。

### Trigger：Host Bridge Synthesis read capabilities

- **触发条件**：Host Bridge / CLI 调用 Synthesis capability。
- **入口**：`hostBridgeCapabilityRegistry.ts` -> Synthesis service。
- **边界**：read capability 与 mutation command 分离；read path 不产生后台任务。

## 明确不会自动触发的场景

以下场景不得自动启动 rebuild、migration 或 agent workflow：

- 打开 Synthesis Workbench；
- 普通 `getSynthesisSnapshot`；
- MCP read-only 工具调用；
- Host Bridge read capability；
- Graph tab 普通 read；
- reset 后发现 `data/synthesis/**` 仍存在；
- 旧 `plugin_task_rows` 中存在 Synthesis 残留任务；
- topic interest metadata 写入后全库 discovery backscan。

这些场景最多返回 diagnostics、recommended commands 或空状态。
