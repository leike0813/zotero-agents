# Synthesis Layer Trigger Map

本文档记录当前 Synthesis layer 中会触发持久化、索引、后台任务、Git Sync、UI snapshot 或 workflow apply 的入口。它是后续制定开发计划时使用的事实表，描述当前实现，而不是理想设计。

主要代码依据：

- `src/modules/synthesis/service.ts`
- `src/modules/synthesis/gitSync.ts`
- `src/modules/synthesis/literatureRegistry.ts`
- `src/modules/synthesisWorkbenchTab.ts`
- `workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs`
- `workflows_builtin/literature-workbench-package/literature-digest/hooks/applyResult.mjs`

## 阅读方式与术语

- **automatic**：由某个已成功的业务写入、timer、retry 或 workflow apply 自动触发，不需要用户再点击对应动作。
- **read-only with diagnostics**：读接口返回 bounded 结果、latest usable state、diagnostics 或内存 hint，但不写 durable state、不 enqueue job。
- **explicit host command**：Workbench UI、Host Bridge 或 MCP 工具明确调用的命令。它可能异步执行，但不是自动触发。
- **workflow apply**：workflow 执行完成后，applyResult hook 调用 host API 写入 Synthesis。
- **timer/retry**：前一次 enqueue 或 failed_retryable 状态设置定时器，到点后自动执行。
- **projection-only rebuild**：只写 `state/` 下可重建 projection，不写 canonical domain assets。默认不触发 Git Sync autosync。
- **canonical mutator**：通过 Synthesis service 修改 durable canonical assets 的操作。大多数 canonical mutator 成功后会触发 Git Sync autosync notify。

## 总览矩阵

| 域 | Trigger | 入口 | 执行方式 | 主要影响 |
| --- | --- | --- | --- | --- |
| Topic Synthesis | workflow apply | `applyTopicSynthesisResult` | workflow apply，同步持久化 | topic current assets、index、topic freshness、Concept KB、Topic Graph、Git Sync notify |
| Tag Vocabulary | save/import | `saveTagVocabulary` / `applyTagVocabularyImport` | explicit service call | tags canonical assets、`tag-index` stale、Git Sync notify |
| Concept KB | display/review action | `updateConceptDisplayText` / `applyConceptReviewAction` | explicit service call | concepts canonical assets、`concept-kb-index` stale、Git Sync notify |
| Topic Graph | accept/reject/review action | `acceptTopicGraphRelation` / `rejectTopicGraphRelation` / `applyTopicGraphReviewAction` | explicit service call | topic graph canonical assets、`topic-graph-index` stale、Git Sync notify |
| Topic delete | delete topic artifact | `deleteTopicArtifact` | explicit service call | topic index/deleted records/topic graph deleted node、Git Sync notify |
| Literature Registry | background rebuild enqueue | `queueLiteratureRegistryRebuild` | debounce background job | literature registry canonical/projection、citation graph projection、maintenance-drained Git Sync notify |
| Literature Registry | Zotero item dirty event | `onNotify` -> `recordSynthesisZoteroItemNotifications` | automatic event record only | update event journal；不 inline rebuild |
| Literature Registry | digest/reference apply dirty event | literature apply hooks -> `recordSynthesisUpdateEvent` | workflow apply event record only | update event journal；不等待 downstream worker |
| Literature Registry | startup lightweight reconcile | `runSynthesisStartupReconcile` | background/lightweight | compares metadata fingerprints, records dirty events |
| Literature Registry | incremental paper worker | `runPaperRegistryIncrementalWorker` | explicit/budgeted worker | single-paper canonical registry assets, projection stale flags, affected topic freshness dirty events, maintenance-drained Git Sync notify |
| Literature Registry | registry read | `getPaperRegistry` | read-only | returns bounded rows, diagnostics, and memory-only read hints |
| Topic Freshness | freshness worker | `runTopicFreshnessWorker` | explicit/budgeted worker | artifact-state freshness/coverage/update availability only |
| Citation Graph | graph read | `queryCitationGraph` | read-only | returns latest projection/legacy graph or empty graph |
| Citation Graph | structure worker | `runCitationGraphStructureWorker` | explicit/budgeted worker | citation structure ownership、lightweight metrics、complex metrics dirty event |
| Citation Graph | complex metrics worker | `runCitationGraphComplexMetricsWorker` | explicit/low-priority worker | complex metrics layer；latest usable metrics preserved |
| Citation Graph | layout worker | `runCitationGraphLayoutWorker` | Graph UI/manual command | layout freshness for one preset; latest usable layout preserved |
| Citation Graph | explicit projection rebuild | `rebuildCitationGraphProjection` / `runLiteratureRegistryJobNow` | explicit command/job | writes citation graph projection from canonical or full registry job |
| Git Sync | canonical store changed | `notifyCanonicalStoreChanged` | debounce background worker | Git export/import, receipts, projection stale |
| Git Sync | failed retryable | scheduled retry timer | timer/retry | reruns sync if not paused/conflict-blocked |
| Workbench Snapshot | open/refresh | `getSynthesisSnapshot` / `getSynthesisSnapshotInput` | read-only | UI DTO only; no rebuild/job enqueue |
| MCP read-only tools | registry/graph/metrics | `getPaperRegistry` / `getCitationGraphSlice` / `getCitationGraphMetrics` | read-only | bounded DTOs, diagnostics, and no rebuild enqueue |

## Workflow / Topic Synthesis Triggers

### Trigger: Topic synthesis apply

- **触发条件**：`create-topic-synthesis` 或 `update-topic-synthesis` workflow 完成，并且 `workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs` 调用 `runtime.hostApi.synthesis.applyTopicSynthesisResult`.
- **入口**：`SynthesisService.applyTopicSynthesisResult`。
- **执行内容**：
  - 校验 final bundle 与 structured topic artifact。
  - 读取 resolver manifest、section manifest、section JSON、KG proposal sidecars。
  - 写入 topic `current/` canonical assets、sections、metadata、Markdown export。
  - 更新 topic definitions、resolvers、resolved paper sets、active topic index。
  - 调用 topic freshness scan，并为当前 topic 重置 fresh baseline。
  - 如有 concept proposal sidecar，调用 Concept KB ingestion。
  - upsert materialized Topic Graph node。
  - 如有 topic graph relation proposal sidecar，调用 Topic Graph proposal ingestion。
  - 写 apply log。
- **影响范围**：
  - `data/synthesis/topics/...`
  - topic index / artifact state / topic definitions / resolvers / resolved paper sets
  - `data/synthesis/concepts/...`
  - `data/synthesis/topic-graph/...`
  - projection registry stale flags
  - Git Sync autosync queue
- **后台/同步行为**：主 apply 是同步写事务；Git Sync 后续通过 debounce worker 后台尝试。
- **失败与降级**：
  - bundle 或 structured artifact 校验失败会拒绝 apply。
  - base hash mismatch 会保存 conflict candidate，不写 current assets，不触发 autosync。
  - concept proposal ingestion 失败只写 warning/log，不阻断 topic artifact apply。
  - topic graph proposal ingestion 失败只写 warning/log，不阻断 topic artifact apply。
- **不会触发/边界**：
  - Agent 只写 proposal sidecar，不直接写 canonical KG assets。
  - Concept cards 和 topic relations 不进入 structured topic artifact 正文。
  - apply 失败或 conflict 不触发 Git Sync autosync notify。
- **代码依据**：`service.ts` 的 `applyTopicSynthesisResult`; `applyTopicSynthesisResult.mjs`.

### Trigger: Concept card proposal ingestion

- **触发条件**：topic synthesis apply 成功解析 `concept_cards_proposal_path`。
- **入口**：`conceptKb.ingestConceptCardProposals`.
- **执行内容**：
  - 校验 concept card proposal。
  - 规范化 label、alias、domain。
  - exact alias 命中时尝试合并。
  - low-confidence 或 ambiguous match 写 review item。
  - 可创建 concept、sense、alias、relation、topic concept link。
- **影响范围**：
  - `data/synthesis/concepts/concepts/`
  - `data/synthesis/concepts/senses/`
  - `data/synthesis/concepts/aliases/`
  - `data/synthesis/concepts/relations/`
  - `data/synthesis/concepts/review/`
  - `data/synthesis/topics/<topic_id>/current/concepts.json`
  - `concept-kb-index` stale
- **后台/同步行为**：在 topic apply 的同步事务流程中执行；整体 apply 成功后通过 service autosync 触发 Git Sync notify。
- **失败与降级**：proposal 摄取失败记录 `concept_cards_proposal_failed` warning/log，主 topic apply 继续。
- **不会触发/边界**：不会把 proposal item 直接当 confirmed canonical identity；低置信/冲突进入 review。
- **代码依据**：`service.ts` 调用 `conceptKb.ingestConceptCardProposals`; `conceptKb.ts`.

### Trigger: Topic Graph relation proposal ingestion

- **触发条件**：topic synthesis apply 成功解析 `topic_graph_relation_proposals_path`。
- **入口**：`topicGraph.ingestRelationProposals`.
- **执行内容**：
  - upsert 当前 materialized topic node。
  - 读取 relation proposals。
  - 将合法 proposal 转换为 suggested edge，或写入 review item。
  - 创建缺失 target placeholder topic node。
  - 跳过 self-edge、cycle 或被用户 confirmed/rejected 覆盖的关系。
- **影响范围**：
  - `data/synthesis/topic-graph/topics/`
  - `data/synthesis/topic-graph/edges/`
  - `data/synthesis/topic-graph/review/`
  - `topic-graph-index` stale
- **后台/同步行为**：在 topic apply 的同步事务流程中执行；整体 apply 成功后通过 service autosync 触发 Git Sync notify。
- **失败与降级**：proposal 摄取失败记录 `topic_graph_relation_proposals_failed` warning/log，主 topic apply 继续。
- **不会触发/边界**：Agent 不写 canonical edge id；插件负责 deterministic edge id、dedupe、cycle/review。
- **代码依据**：`service.ts` 调用 `topicGraph.upsertMaterializedTopic` 和 `topicGraph.ingestRelationProposals`; `topicGraph.ts`.

## Tag / Concept / Topic Graph Triggers

### Trigger: Tag vocabulary save/import

- **触发条件**：Workbench/host 调用 `saveTagVocabulary` 或 `applyTagVocabularyImport`。
- **入口**：`SynthesisService.saveTagVocabulary`; `SynthesisService.applyTagVocabularyImport`.
- **执行内容**：
  - 校验 vocabulary、aliases、abbrev、protocol。
  - 写 canonical tag files 和 manifest。
  - 标记 `tag-index` projection stale。
  - import 成功后清空 service 内的 import preview state。
- **影响范围**：
  - `data/synthesis/tags/vocabulary.json`
  - `data/synthesis/tags/aliases.json`
  - `data/synthesis/tags/abbrev.json`
  - `data/synthesis/tags/protocol.json`
  - `data/synthesis/tags/manifest.json`
  - projection registry
  - Git Sync autosync queue
- **后台/同步行为**：canonical write 同步执行；Git Sync notify 后 debounce。
- **失败与降级**：validation/import 失败不写半成品；返回 diagnostics。
- **不会触发/边界**：`previewTagVocabularyImport` 只生成 preview state，不写 canonical，不触发 Git Sync。
- **代码依据**：`service.ts`; `tagVocabulary.ts`.

### Trigger: Concept display edit / review action

- **触发条件**：Workbench Concepts tab 或 host command 调用 display text update 或 review action。
- **入口**：`updateConceptDisplayText`; `applyConceptReviewAction`.
- **执行内容**：
  - display edit 只允许更新受控展示字段。
  - review action 支持 approve as new、merge into selected concept、reject。
  - 写 concept/sense/alias/topic link 或关闭 review item。
  - 标记 `concept-kb-index` stale。
- **影响范围**：
  - Concept KB canonical assets
  - topic concept links
  - concept review items
  - Git Sync autosync queue
- **后台/同步行为**：canonical write 同步执行；Git Sync notify 后 debounce。
- **失败与降级**：
  - missing review item、missing target concept 或非法 action 返回错误/diagnostics。
  - merge action 不应默认使用第一个 candidate；必须传 selected target concept id。
- **不会触发/边界**：`rebuildConceptKbIndex` 只重建 projection，不触发 Git Sync。
- **代码依据**：`service.ts`; `conceptKb.ts`; `synthesisWorkbenchTab.ts`.

### Trigger: Topic Graph edge decision / review action

- **触发条件**：Topic Inspector 中用户 accept/reject suggested edge，或处理 relation review item。
- **入口**：`acceptTopicGraphRelation`; `rejectTopicGraphRelation`; `applyTopicGraphReviewAction`.
- **执行内容**：
  - suggested edge 可改为 confirmed 或 rejected。
  - relation review item 可 approve 为 suggested edge，或 reject。
  - 保留 provenance/evidence。
  - 标记 `topic-graph-index` stale。
- **影响范围**：
  - topic graph edge canonical files
  - topic graph review files
  - projection registry
  - Git Sync autosync queue
- **后台/同步行为**：canonical write 同步执行；Git Sync notify 后 debounce。
- **失败与降级**：missing edge、非 suggested edge、missing review item 返回结构化 diagnostic 或错误。
- **不会触发/边界**：不会自动 confirm agent proposal；agent proposal 默认只能 suggested 或 review。
- **代码依据**：`service.ts`; `topicGraph.ts`; `synthesisWorkbenchTab.ts`.

### Trigger: Topic artifact delete

- **触发条件**：Workbench/host 调用 `deleteTopicArtifact`。
- **入口**：`SynthesisService.deleteTopicArtifact`.
- **执行内容**：
  - 从 active index 移除 topic。
  - 将 topic store 复制到 deleted area。
  - 标记 topic definition 为 deleted。
  - 删除 resolver / resolved paper set / artifact state entry。
  - 在 topic graph 中写 deleted materialized node。
- **影响范围**：
  - active topic index
  - deleted topic records
  - topic definitions/resolvers/paper sets/artifact state
  - topic graph node
  - Git Sync autosync queue
- **后台/同步行为**：canonical write 同步执行；Git Sync notify 后 debounce。
- **失败与降级**：missing topic 返回 `not_found`，不触发 autosync。
- **不会触发/边界**：不会自动删除 user-confirmed topic graph edges。
- **代码依据**：`service.ts`.

### Trigger: Projection-only rebuilds

- **触发条件**：显式调用 `rebuildTagVocabularyIndex`、`rebuildConceptKbIndex`、`rebuildTopicGraphIndex`、`rebuildCitationGraphProjection`。
- **入口**：对应 service facade。
- **执行内容**：从 canonical assets 重建 `state/` projection DTO。
- **影响范围**：
  - `data/synthesis/state/*.json`
  - projection registry rebuild receipt
- **后台/同步行为**：同步执行，不走 Git Sync autosync。
- **失败与降级**：canonical 缺失或损坏时返回错误/diagnostics。
- **不会触发/边界**：projection-only 操作不属于 Git-synced canonical mutation。
- **代码依据**：`service.ts`; domain service rebuild projection functions.

## Literature Registry / Citation Graph Triggers

### Trigger: Paper registry read

- **触发条件**：调用 `getPaperRegistry`。
- **入口**：`SynthesisService.getPaperRegistry`.
- **执行内容**：
  - 尝试读取 canonical-backed literature projection。
  - projection 可用时返回 bounded projection rows。
  - projection 缺失且 service options 显式提供 `registryInputs` 时，返回 bounded fallback rows。
  - projection 缺失且只有真实 `libraryAdapter` 时，不扫描 Zotero library，返回空 rows、missing diagnostics 和 recommended command。
  - projection 缺失或 stale 时记录 process-local read hint。
- **影响范围**：
  - 当前调用返回 `diagnostics.projection_found` 和 `diagnostics.stale`。
  - 当前调用可返回 `diagnostics.recommended_commands` 和 `diagnostics.read_hints`。
- **后台/同步行为**：只读；不会启动或排队 rebuild。
- **失败与降级**：projection missing 时返回 bounded fallback/empty rows 和 diagnostics。
- **不会触发/边界**：
  - 不调用 `queueLiteratureRegistryRebuild`。
  - 不写 literature job state。
  - 不写 projection。
  - 不扫描真实 `libraryAdapter`。
- **代码依据**：`service.ts` 的 `getPaperRegistry`.

### Trigger: Literature registry rebuild queue

- **触发条件**：显式调用 `queueLiteratureRegistryRebuild`。
- **入口**：`SynthesisService.queueLiteratureRegistryRebuild`.
- **执行内容**：
  - 调用 `deriveLiteratureJobState` 判定 source/canonical/projection freshness。
  - 写 job state 为 `queued`。
  - 设置 debounce timer。
  - timer 到点后调用 `runLiteratureRegistryJobNow`.
- **影响范围**：
  - `data/synthesis/state/literature-registry-job-state.json`
  - 后续可能写 citation graph canonical/projections
- **后台/同步行为**：background debounce，默认约 250ms。
- **失败与降级**：如果已有 running job，直接返回 running state。
- **不会触发/边界**：不会由 `getPaperRegistry` 或其他 read path 自动触发；不会阻塞 UI read。
- **代码依据**：`service.ts`.

### Trigger: Zotero item dirty event

- **触发条件**：Zotero Notifier 发送 item `add`、`modify`、`delete`/`trash`、`restore`/`undelete`/`untrash` 事件。
- **入口**：`hooks.ts` 的 `onNotify` -> `recordSynthesisZoteroItemNotifications`.
- **执行内容**：
  - 将 Zotero item id/key 映射为 `zotero_item` dirty scope。
  - 记录并合并 `zotero_item_added`、`zotero_item_updated`、`zotero_item_deleted` 或 `zotero_item_restored` update event。
  - 不读取 child notes，不构建 registry，不触发 citation graph rebuild。
- **影响范围**：
  - `zotero-agents.db` 中的 `synthesis-updates` event row。
  - update queue pending count。
- **后台/同步行为**：事件记录是轻量同步/异步 fire-and-forget；后续处理由显式或后续 worker 触发。
- **失败与降级**：无法解析 item key 时跳过该 id；记录失败不影响 Zotero 原事件。
- **不会触发/边界**：不会 inline 扫全库，不写 canonical paper records，不写 projection，不触发 Git Sync。
- **代码依据**：`hooks.ts`; `itemObserver.ts`; `updateEvents.ts`.

### Trigger: Literature digest / reference matching dirty event

- **触发条件**：
  - `literature-digest` apply 成功写入 digest/references/citation-analysis notes。
  - `reference-matching` apply 成功更新 references payload 和 related items。
- **入口**：
  - `workflows_builtin/literature-workbench-package/literature-digest/hooks/applyResult.mjs`
  - `workflows_builtin/literature-workbench-package/reference-matching/hooks/applyResult.mjs`
- **执行内容**：
  - digest apply 记录 `digest_applied` 与 `paper_artifact_changed` paper-scoped dirty events。
  - reference matching apply 记录 `reference_matching_applied` paper-scoped dirty event。
  - event scope 使用 parent Zotero item key。
- **影响范围**：update event journal 与 queue state。
- **后台/同步行为**：apply hook 只记录 dirty event；不等待 registry/citation downstream worker。
- **失败与降级**：host API 缺失或 event record 失败不会导致 applyResult 失败。
- **不会触发/边界**：不会在 apply hook 中重建 Paper Registry、Citation Graph 或 layout。
- **代码依据**：上述 apply hooks；`SynthesisService.recordSynthesisUpdateEvent`.

### Trigger: Startup lightweight reconcile

- **触发条件**：插件启动后 Synthesis service 可用时调用 `runSynthesisStartupReconcile`，或测试/host 显式调用该 facade。
- **入口**：`SynthesisService.runSynthesisStartupReconcile`.
- **执行内容**：
  - 读取 Zotero item identity/metadata fingerprint，或测试注入的 registry input fingerprint。
  - 与 canonical paper record 的 `metadata` facet hash 对比。
  - 对 missing/changed/deleted/restored item 记录 `startup_reconcile_detected_dirty_items` dirty event。
  - 更新 `startup_reconcile` 状态为 `checking`、`queued`、`ready` 或失败状态。
- **影响范围**：update event journal 和 queue state。
- **后台/同步行为**：lightweight；不阻塞 Workbench/dashboard；真实维护由后续 worker 消费 dirty events。
- **失败与降级**：失败写 `failed_retryable` startup reconcile status。
- **不会触发/边界**：不读取 digest/reference child note payload，不写 registry/citation projection，不触发 full rebuild。
- **代码依据**：`service.ts`; `libraryAdapter.ts`.

### Trigger: Paper Registry incremental worker

- **触发条件**：显式调用 `runPaperRegistryIncrementalWorker({ batchLimit, timeBudgetMs })`。
- **入口**：`SynthesisService.runPaperRegistryIncrementalWorker`.
- **执行内容**：
  - 读取 queued dirty events。
  - 只消费可安全映射为单个 paper/item 的 registry dirty scope。
  - 通过测试注入的 `registryInputs` 或 adapter `getRegistryInputForItem` 读取单 item 输入。
  - 更新该 paper 的 canonical paper/reference/context/resolution/cleanup records。
  - 标记 `literature-registry-index` 与 `citation-graph-index` stale。
  - 记录 `citation_graph_structure_dirty` dirty event，scope 为更新后的 paper。
  - 根据 existing topic artifact-state 的 paper usage 映射记录 `topic_freshness_dirty`，并将受影响 topic 标记为 `queued`。
  - 将已处理 event 标记 completed；unsafe scope 标记 failed_permanent 并建议显式 full rebuild。
  - 记录 process-local canonical maintenance epoch，待 worker drain 后合并触发 Git Sync notify。
- **影响范围**：
  - `data/synthesis/citation-graph/...` 中受影响 paper 相关 canonical records。
  - projection registry stale flags。
  - update event queue state。
- **后台/同步行为**：当前阶段是 explicit/budgeted worker；paused queue 下不处理；Git Sync notify 在 canonical workers 全部 drain 后经过 debounce 异步触发。
- **失败与降级**：单 paper 输入不可用时标记 failed_retryable 或 deleted 情况 diagnostic；不 fallback 到全库扫描。
- **不会触发/边界**：不会自动 full rebuild；不会直接刷新 citation graph projection/layout；不会重写 topic artifact。Citation graph projection 由 structure worker 消费 dirty event；topic freshness 由 freshness worker 消费 dirty event。
- **代码依据**：`service.ts`; `literatureRegistry.ts`; `libraryAdapter.ts`; `updateEvents.ts`.

### Trigger: Topic freshness worker

- **触发条件**：显式调用 `runTopicFreshnessWorker({ batchLimit, timeBudgetMs })`，且 queue 中存在 `topic_freshness_dirty` event。
- **入口**：`SynthesisService.runTopicFreshnessWorker`.
- **执行内容**：
  - 只消费 topic-scoped freshness dirty events。
  - 读取 topic index、artifact-state、resolver/paper-set state 和 Paper Registry projection rows。
  - 重新计算指定 topic 的 freshness、coverage、readiness/update intent 输入。
  - 将 topic state 从 `queued/running` 刷新为 `fresh/stale/dirty/failed`。
- **影响范围**：
  - `data/synthesis/state/artifact-state.json`
  - update event queue state
- **后台/同步行为**：explicit/budgeted worker；paused queue 下不处理。
- **失败与降级**：missing topic 或计算失败时标记 `failed` 并保留 diagnostic；不提交 workflow、不自动重写 topic artifact。
- **不会触发/边界**：不改 `topics/*/current` 文件，不改 Topic Graph canonical relations，不触发 Git Sync autosync。
- **代码依据**：`service.ts`; `updateEvents.ts`.

### Trigger: Literature registry background job

- **触发条件**：debounce timer 到点、Workbench command `runLiteratureRegistryJobNow`、或 retry 调用。
- **入口**：`SynthesisService.runLiteratureRegistryJobNow`.
- **执行内容**：
  - 读取 current registry inputs 和 citation graph paper inputs。
  - 调用 `literatureRegistry.rebuildLiteratureRegistry`.
  - 写 paper/work/reference/context/cleanup proposal canonical assets。
  - 写 literature registry projection。
  - 写 citation graph projection、metrics、layouts、freshness DTO。
  - 更新 literature job state 为 `ready`。
  - 成功后记录 process-local canonical maintenance epoch，待 canonical workers drain 后合并触发 Git Sync notify。
- **影响范围**：
  - `data/synthesis/citation-graph/...`
  - `data/synthesis/state/literature-registry-index.json`
  - `data/synthesis/state/citation-graph-index.json`
  - literature job state
  - maintenance-drained Git Sync autosync queue
- **后台/同步行为**：
  - 由 queue 触发时是后台 timer 执行。
  - 由 explicit command 触发时立即开始 async job。
  - Git Sync notify 不在 canonical 写入后立即执行，而是在 canonical maintenance worker drain 后经过 debounce 执行。
- **失败与降级**：
  - 失败写 `failed_retryable`、`retry_attempt`、`next_retry_at` 和 diagnostic。
  - 不删除 latest usable projection。
  - 安排 retry timer。
- **不会触发/边界**：不会由 Zotero item 新增、digest apply 或 reference matching apply 直接触发。
- **代码依据**：`service.ts`; `literatureRegistry.ts`.

### Trigger: Literature job retry

- **触发条件**：previous literature job failed_retryable 并有 `next_retry_at`。
- **入口**：`scheduleLiteratureRetry`; timer calls `runLiteratureRegistryJobNow`.
- **执行内容**：到点后重新执行 literature registry background job。
- **影响范围**：同 background job。
- **后台/同步行为**：timer/retry；默认 retry delays 为 1min、5min、15min、30min。
- **失败与降级**：再次失败会增加 retry attempt 并写新的 next retry time。
- **不会触发/边界**：当前代码没有 pause gate 专门阻断 literature retry；Git Sync pause 不影响 literature retry。
- **代码依据**：`service.ts`.

### Trigger: Citation graph read

- **触发条件**：host、MCP、Workbench 或 service caller 调用 `queryCitationGraph`.
- **入口**：`SynthesisService.queryCitationGraph`.
- **执行内容**：
  - 读取 canonical-backed `citation-graph-index.json` 中的 graph。
  - 如果 canonical-backed projection 缺失，读取 legacy persisted graph。
  - 如果都缺失，返回 empty graph 并记录 process-local read hint。
- **影响范围**：
  - 当前调用返回值。
- **后台/同步行为**：只读。
- **失败与降级**：projection missing 时返回 empty graph。
- **不会触发/边界**：
  - 不调用 `literatureRegistry.rebuildLiteratureRegistry`。
  - 不写 legacy unified graph/layout/metrics files。
  - 不写 canonical-backed projection。
  - 不触发 layout recompute。
- **代码依据**：`service.ts`; `synthesisWorkbenchTab.ts`.

### Trigger: Citation graph structure worker

- **触发条件**：显式调用 `runCitationGraphStructureWorker({ batchLimit, timeBudgetMs })`，且 queue 中存在 `citation_graph_structure_dirty` event。
- **入口**：`SynthesisService.runCitationGraphStructureWorker`.
- **执行内容**：
  - 只消费 queued citation structure dirty events。
  - 对 paper scope，从 canonical literature/reference records 生成最新 graph structure projection。
  - 在 `citation-graph-index.json` 中维护 source-paper outgoing edge ownership 与 target/work incoming group ownership。
  - 同步刷新 lightweight metrics：incoming/outgoing、external/unresolved、matched/unresolved/ambiguous summary。
  - 将 complex metrics 标记 stale，并记录 `citation_graph_complex_metrics_dirty` event。
- **影响范围**：
  - `data/synthesis/state/citation-graph-index.json`
  - legacy graph/metrics/freshness JSON DTO
  - update event journal / queue state
- **后台/同步行为**：explicit/budgeted worker；paused queue 下不处理。
- **失败与降级**：unsafe scope 或 missing paper 不自动 full rebuild；写 diagnostic 并建议显式 projection rebuild。
- **不会触发/边界**：不计算 layout；不扫描 Zotero 全库；不重写 canonical paper/reference records；不触发 Git Sync。
- **代码依据**：`service.ts`; `literatureRegistry.ts`; `updateEvents.ts`.

### Trigger: Citation graph complex metrics worker

- **触发条件**：显式或低优先级调度调用 `runCitationGraphComplexMetricsWorker({ timeBudgetMs })`，且 queue 中存在 `citation_graph_complex_metrics_dirty` event。
- **入口**：`SynthesisService.runCitationGraphComplexMetricsWorker`.
- **执行内容**：
  - 读取 latest citation structure projection。
  - 复用现有 graph metrics 算法刷新 complex metrics。
  - 成功后将 metric layer 标记 `ready`，并保留 `metrics_hash`。
- **影响范围**：
  - `data/synthesis/state/citation-graph-index.json`
  - `data/synthesis/state/citation-graph-metrics.json`
  - update event journal / queue state
- **后台/同步行为**：low-priority worker；paused queue 下不处理。
- **失败与降级**：projection missing 时失败为 non-retryable diagnostic；计算失败时标记 retryable，latest usable metrics 保留在 projection 中。
- **不会触发/边界**：不启动 layout recompute；不 rebuild paper registry；不从 read API 自动运行。
- **代码依据**：`service.ts`; `literatureRegistry.ts`; `citationGraph.ts`.

### Trigger: Citation graph layout worker

- **触发条件**：Workbench Graph tab 打开、Graph preset 切换且当前 preset layout missing/stale/failed，或用户点击 `manualRecomputeLayout`。
- **入口**：`SynthesisService.runCitationGraphLayoutWorker`; Workbench handler `refreshGraphLayoutIfNeeded`; host command `manualRecomputeLayout`.
- **执行内容**：
  - 只读取 latest citation graph projection。
  - 如 complex metrics stale/missing，先刷新 projection-local complex metrics。
  - 为指定 preset 重新计算 layout，并写入 layout freshness metadata：`source_graph_hash`、`source_complex_metrics_hash`、`status`、`updated_at`、`diagnostics`。
- **影响范围**：
  - `data/synthesis/state/citation-graph-index.json`
  - `data/synthesis/state/citation-graph-layouts.json`
  - 如 metrics 同步刷新，还会更新 `citation-graph-metrics.json` 与 freshness DTO。
- **后台/同步行为**：Graph UI 触发时后台异步执行；UI 先显示 latest usable graph/layout，完成后刷新 snapshot。Manual recompute 是显式命令并强制刷新当前 preset。
- **失败与降级**：projection missing 或 layout 失败时返回 bounded diagnostic；latest usable graph/layout 保留。
- **不会触发/边界**：MCP/CLI `queryCitationGraph`、`getCitationGraphSlice`、`getCitationGraphMetrics` 不触发 layout；layout/projection 写入不触发 Git Sync。
- **代码依据**：`service.ts`; `literatureRegistry.ts`; `synthesisWorkbenchTab.ts`; `citationGraph.ts`.

### Trigger: Explicit citation graph projection rebuild

- **触发条件**：host 显式调用 `rebuildCitationGraphProjection`；full registry job 可通过 `runLiteratureRegistryJobNow` 产生新的 graph projection。
- **入口**：`SynthesisService.rebuildCitationGraphProjection`; `SynthesisService.runLiteratureRegistryJobNow`.
- **执行内容**：
  - 从 canonical literature/citation records 重建 citation graph projection。
  - full registry job 还会重建 canonical paper/work/reference/context assets。
- **影响范围**：
  - `data/synthesis/state/citation-graph-index.json`
  - full registry job 还会影响 `data/synthesis/citation-graph/...` 和 Git Sync autosync queue。
- **后台/同步行为**：显式 command；`runLiteratureRegistryJobNow` 是 async job，`rebuildCitationGraphProjection` 是 projection-only command。
- **失败与降级**：canonical 缺失或损坏时返回错误/diagnostics；latest usable projection 不应由 read path 清空。
- **不会触发/边界**：MCP/CLI graph reads 不触发此入口。
- **代码依据**：`service.ts`; `synthesisWorkbenchTab.ts`.

### Trigger: Citation graph read-only tools

- **触发条件**：MCP/host/Workbench 调用 `getCitationGraphSlice` 或 `getCitationGraphMetrics`.
- **入口**：`SynthesisService.getCitationGraphSlice`; `SynthesisService.getCitationGraphMetrics`.
- **执行内容**：
  - 读取 citation graph projection 或 legacy persisted snapshot。
  - 返回 bounded slice/metrics DTO。
  - projection missing/stale 时返回 diagnostics。
- **影响范围**：只影响返回值。
- **后台/同步行为**：只读；不 enqueue rebuild。
- **失败与降级**：snapshot missing 时返回 `ok: false` 和 warnings。
- **不会触发/边界**：不会刷新 paper registry，不会 rebuild citation graph。
- **代码依据**：`service.ts`.

## Git Sync Triggers

### Trigger: Canonical store changed notify

- **触发条件**：canonical mutator 通过 `runCanonicalWriteWithAutosync` 成功写入，且 `shouldNotify` 为 true。
- **入口**：`notifyGitSyncAfterCanonicalWrite` -> `gitSync.notifyCanonicalStoreChanged`.
- **执行内容**：
  - 调用 `enqueueGitSync`。
  - 如果 adapter 可用、未 paused、未 conflict-blocked，启动 debounce timer。
- **影响范围**：
  - Git Sync state queue status
  - 后续 sync receipts/conflict report/canonical import
- **后台/同步行为**：debounce background worker。
- **失败与降级**：notify 失败不会回滚已经成功的 canonical write；只记录 Git Sync diagnostic。
- **不会触发/边界**：projection-only rebuild 不触发。
- **代码依据**：`service.ts`; `gitSync.ts`.

### Trigger: Canonical maintenance epoch drained

- **触发条件**：canonical maintenance worker 写入 canonical assets，并且当前所有 canonical maintenance workers 已结束。当前维护 worker 包括 `runLiteratureRegistryJobNow` 和 `runPaperRegistryIncrementalWorker`。
- **入口**：`beginCanonicalMaintenanceWorker(...).markCanonicalMutation()` -> `scheduleCanonicalMaintenanceGitSync`.
- **执行内容**：
  - 记录 process-local canonical mutation epoch。
  - 将 maintenance-driven sync 标记为 pending。
  - 等待 active worker count 归零。
  - 再经过较大的 debounce window 后调用 `notifyGitSyncAfterCanonicalWrite`。
- **影响范围**：
  - process-local maintenance status
  - Git Sync queued run
  - 后续 Git Sync receipts/conflict report/canonical import
- **后台/同步行为**：worker 完成后异步 debounce；不阻塞 registry/citation maintenance 的业务返回。
- **失败与降级**：
  - notify 失败只进入 Git Sync diagnostic，不回滚 canonical maintenance 已完成的写入。
  - 手动 `syncNow` 在 active/pending maintenance 期间仍可执行，但会返回 `canonical_maintenance_active` 或 `canonical_maintenance_sync_pending` diagnostic。
- **不会触发/边界**：
  - projection rebuild、job state write、read hint、metrics、layout、topic freshness state-only update 不增加 canonical mutation epoch，不触发 Git Sync。
  - maintenance epoch 只是 process-local coordination，不写 durable queue state。
- **代码依据**：`service.ts` (`beginCanonicalMaintenanceWorker`, `scheduleCanonicalMaintenanceGitSync`, `syncNow`).

### Trigger: Git Sync debounce worker

- **触发条件**：`notifyCanonicalStoreChanged` 排队成功并经过 debounce window。
- **入口**：`gitSync.runSync`.
- **执行内容**：
  - acquire persistent lock。
  - export canonical allowlist snapshot。
  - copy to sync worktree。
  - adapter fetch/merge/push。
  - validate merged worktree。
  - conflict gate。
  - import canonical snapshot via Foundation batch transaction。
  - write receipt and release lock。
- **影响范围**：
  - sync worktree
  - `data/synthesis/sync/...`
  - canonical assets imported from remote
  - projection stale flags
  - Git Sync state, receipts, diagnostics, conflict report
- **后台/同步行为**：background debounce worker。
- **失败与降级**：
  - active lock -> queued。
  - blocked conflict -> stop, no remote import。
  - retryable failure -> failed_retryable and retry timer。
  - validation failure -> failed_permanent。
- **不会触发/边界**：
  - No adapter -> disabled, no sync。
  - paused -> queued, no run。
  - conflict-blocked -> no overwrite。
- **代码依据**：`gitSync.ts`.

### Trigger: Git Sync retry

- **触发条件**：previous sync run failed_retryable and `next_retry_at` is set.
- **入口**：`gitSync.scheduleRetryFromState`.
- **执行内容**：timer calls `runSync`.
- **影响范围**：same as sync run.
- **后台/同步行为**：timer/retry。
- **失败与降级**：retry failure persists failed_retryable diagnostics.
- **不会触发/边界**：paused, disabled, or blocked conflict prevents automatic retry behavior.
- **代码依据**：`gitSync.ts`.

## Workbench / MCP / Host Bridge Triggers

### Trigger: Workbench initial snapshot and refresh

- **触发条件**：Workbench init、explicit refresh、or post-command snapshot refresh.
- **入口**：`sendSnapshot`; `getSynthesisSnapshot`; `getSynthesisSnapshotInput`.
- **执行内容**：
  - Read topic rows, registry projection DTOs, citation graph projection, tag/concept/topic graph DTOs, Git Sync state, literature job peek state, and synthesis update queue state.
  - Build UI snapshot, including maintenance summary: latest usable registry/graph age, pending dirty count, active canonical worker, last failure, stale/partial/missing status, and recommended commands.
- **影响范围**：Workbench UI only.
- **后台/同步行为**：read-only.
- **失败与降级**：read failures are surfaced as diagnostics where supported.
- **不会触发/边界**：
  - Does not enqueue literature rebuild.
  - Does not write job state.
  - Does not rebuild citation graph.
  - Does not trigger Git Sync.
- **代码依据**：`service.ts`; `synthesisWorkbenchTab.ts`; `uiModel.ts`.

### Trigger: Cached Workbench UI actions

- **触发条件**：select tab, set filters, select tag/concept/topic, graph view changes, overlay toggle, review candidate selection.
- **入口**：`synthesisWorkbenchTab` action handling and `uiModel` state projection.
- **执行内容**：
  - Rebuild UI snapshot from cached `SynthesisUiSnapshotInput`.
  - No service-level full snapshot read when cached input is available.
- **影响范围**：Workbench UI state only.
- **后台/同步行为**：in-memory UI projection.
- **失败与降级**：unknown action returns cached snapshot or warning diagnostic.
- **不会触发/边界**：does not touch canonical, projections, literature job, or Git Sync.
- **代码依据**：`synthesisWorkbenchTab.ts`; `uiModel.ts`.

### Trigger: Explicit Workbench host commands

- **触发条件**：user clicks a Workbench button that maps to a host command.
- **入口**：`synthesisWorkbenchTab.ts`.
- **执行内容**：depends on command:
  - `manualRecomputeLayout` -> `runCitationGraphLayoutWorker`.
  - `runLiteratureRegistryJobNow` -> immediate literature job.
  - `retryLiteratureRegistryJob` -> retry literature job now.
  - `rebuildTagVocabularyIndex`, `rebuildConceptKbIndex`, `rebuildTopicGraphIndex` -> projection-only rebuild.
  - review/accept/reject/save/import commands -> canonical mutators.
  - Git Sync commands -> sync/pause/resume/retry/resolve conflict.
- **影响范围**：varies by command.
- **后台/同步行为**：commands are async; UI posts snapshot after completion/failure.
- **失败与降级**：errors are reported via Workbench error reporting and then snapshot refresh runs in finally.
- **不会触发/边界**：only commands with canonical writes trigger Git Sync autosync.
- **代码依据**：`synthesisWorkbenchTab.ts`.

### Trigger: MCP read-only Synthesis tools

- **触发条件**：MCP tool call for paper registry, citation graph slice, citation graph metrics, topic paper digest.
- **入口**：`zoteroMcpProtocol.ts`; `mcpService.ts`; service read facades.
- **执行内容**:
  - Return bounded DTOs.
  - `getPaperRegistry` returns bounded rows, diagnostics, recommended commands, maintenance status, and memory-only hints when stale/missing.
  - citation graph slice/metrics remain read-only and include bounded freshness/maintenance diagnostics plus recommended commands.
- **影响范围**：tool response only.
- **后台/同步行为**：read-only；missing/stale path 只返回 diagnostics 和 recommended commands，不 queue background job。
- **失败与降级**：returns bounded diagnostics instead of raw Zotero objects or full graph dump.
- **不会触发/边界**：read-only registry/graph tools do not enqueue rebuilds, write job state, write projections, or rebuild graph synchronously.
- **代码依据**：`mcpService.ts`; `zoteroMcpProtocol.ts`; `service.ts`.

### Trigger: Host Bridge Synthesis read capabilities

- **触发条件**：Host Bridge / CLI 调用 `synthesis.get_paper_registry`、`synthesis.query_citation_graph`、`synthesis.get_citation_graph_slice` 或 `synthesis.get_citation_graph_metrics`。
- **入口**：`hostBridgeCapabilityRegistry.ts` -> Synthesis service read facade。
- **执行内容**：
  - 返回 bounded read-only DTO。
  - 携带 freshness diagnostics、maintenance status 和 recommended commands。
- **影响范围**：Host Bridge response only.
- **后台/同步行为**：read-only；不 enqueue registry/citation rebuild，不写 projection，不写 job state。
- **失败与降级**：缺失 projection 时返回 missing/stale diagnostics 和推荐命令，不扫描 Zotero 全库。
- **不会触发/边界**：不会启动 Paper Registry incremental worker、Citation Graph structure/metrics/layout worker，也不会触发 Git Sync。
- **代码依据**：`hostBridgeCapabilityRegistry.ts`; `service.ts`.

## 明确不会自动触发的场景

当前实现中，下面这些场景不会自动触发 literature registry 或 citation graph rebuild：

- 新 Zotero 文献入库、metadata/tag/collection 变化、删除或恢复：只记录 dirty event，不 inline rebuild。
- `literature-digest` workflow applyResult 写入 digest/references/citation-analysis notes：只记录 dirty event，不等待 downstream worker。
- `literature-digest` 的 auto reference matching 完成：只记录 dirty event。
- `reference-matching` workflow applyResult 完成：只记录 dirty event。
- 打开 Synthesis Workbench。
- Workbench 切 tab、切 filter、切 graph view、选中 topic/concept/tag。
- `getSynthesisSnapshot`.
- `getCitationGraphSlice`.
- `getCitationGraphMetrics`.
- `previewTagVocabularyImport`.
- tag/concept/topic graph projection-only rebuild 后的 Git Sync autosync。

这些边界是当前代码事实，不代表未来计划。当前已经建立 dirty event 入口和按预算执行的 Paper Registry、Citation Graph structure/metrics/layout、Topic freshness worker；dirty event 仍不等于立即 rebuild，必须由显式 worker、调度器或后续自动 drain 机制消费。

## 开发计划关注点

- **生产自动 drain 策略**：当前 worker facade 已可按预算处理 dirty events；是否由启动 reconcile、idle timer 或用户设置自动 drain、如何限制大型库预算，还需要后续阶段明确。
- **read-path purity 维护**：`getPaperRegistry` 和 `queryCitationGraph` 已改为只读；后续新增 UI/MCP/Host Bridge 读能力时必须继续避免 read-path enqueue/write。
- **literature retry pause 语义**：Git Sync retry 有 paused/conflict gate；literature job retry 当前没有独立 pause gate。如需长期后台治理，应补齐 pause/resume。
- **projection-only rebuild 与 Git Sync 边界**：当前 projection 不参与 Git Sync，这是预期。若未来引入 remote projection cache，需要单独设计。
- **Workbench trigger 可见性**：UI snapshot 已暴露 maintenance summary；后续真实 UI 呈现需要继续避免让用户误以为打开页面会自动重建。
