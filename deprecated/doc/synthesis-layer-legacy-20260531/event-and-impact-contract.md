# Synthesis Event 与 Impact 合同

本文档定义 Synthesis Layer 中 source event、invalidation policy、dirty queue、worker progress 的边界。架构简化后，Synthesis 不再需要一个跨全域的“大脑式 impact planner”；需要的是一个薄的 event routing / invalidation policy 表，用来把领域变化映射为有限 dirty events、review items、job recommendations、diagnostics 和 supersede/clear commands。

## 设计目标

- **事件语义分层**：区分 source event、invalidation event、job/progress event。
- **影响规则显式化**：领域变化通过薄规则表生成 dirty events、review items 或 worker recommendations；规则表不拥有业务事实。
- **scope 可解释**：每个 dirty event 必须有明确 scope，不允许无界事件静默触发 full rebuild。
- **旧任务可失效**：full rebuild 或 clean reset 必须能够让旧 epoch/basis 的 queued/running events 失效。
- **worker 单责**：worker 只消费自己负责的 event type，并在预算内推进。
- **进度真实**：job progress 只能报告真实 item count 或固定 phase count；未知工作量保持 indeterminate。

## 现有实现状态

Status: `partial`。Repository-backed dirty events 和 job progress 已存在；thin routing policy、epoch/basis guard 和 bulk drift 合同仍未完整落地。

当前实现已经有 repository-backed dirty event 和 job progress，但 event routing / invalidation rules 仍分散：

- `src/modules/synthesis/updateEvents.ts` 负责 event normalization、queue state、startup reconcile state。
- `src/modules/synthesis/repository.ts` 持久化 `synt_dirty_event` 和 `synt_job_state`。
- `src/modules/synthesis/service.ts` 中的 `runPaperRegistryIncrementalWorker`、citation graph workers、transitional topic freshness/source-check logic 仍直接判断部分 routing/invalidation 范围。
- 新增 Zotero item 可以通过 `zotero_item_added` 进入增量 registry cache；但它不会直接让已有 topic source check/freshness dirty，也不会触发 topic discovery。只有该条目完成 literature-digest apply 并写入 matching metadata 后，才对这一个 literature 执行 apply-time discovery matching。
- Startup reconcile 比较 Zotero metadata fingerprint 与 DB 当前 row hash；它跳过 DB 中不存在的新 item，避免 clean install 后制造残留队列。
- Startup reconcile 的目标合同是 bounded detector，不是 unbounded impact executor。小规模 drift 可转为 bounded dirty events；bulk/structural drift 必须聚合为 source drift incident，并推荐显式 rebuild/repair。
- 兼容残留：当前代码仍接受 `reference_matching_applied`，且旧 `reference-matching` workflow 与 `literature-digest.auto_reference_matching` hook 仍可能记录它。该事件不属于目标治理模型，应迁移为 canonical `paper_artifact_changed` / `digest_applied` 后移除。
- 当前缺口：没有独立薄层 `eventRoutingPolicy` / `invalidationPolicy`，没有统一 `registry_epoch` / graph basis guard，full rebuild 开始时也没有统一 supersede 旧 dirty events 的合同。当前实现可继续使用历史 `index_generation` 字段名，但语义应降级为 registry/cache epoch。

## 事件分类

### Source Event

Source event 表示外部或领域事实发生变化，但不直接说明下游怎么处理。

| Event | 来源 | 典型 scope | 目标处理 |
| --- | --- | --- | --- |
| `zotero_item_added` | Zotero observer | `zotero_item:itemKey` | 增量 registry cache；不触发 discovery |
| `zotero_item_updated` | Zotero observer/startup reconcile | `zotero_item:itemKey` | 增量 registry cache，artifact/fingerprint diff |
| `zotero_item_deleted` | Zotero observer/startup reconcile | `zotero_item:itemKey` | deletion review 或 registry cache reconcile |
| `digest_applied` | artifact apply | `paper:libraryId:itemKey` | registry cache artifact state refresh；对该 literature 执行 apply-time discovery matching |
| `paper_artifact_changed` | artifact note changed | `paper:libraryId:itemKey` | registry cache + graph；topic 侧只在显式 source check 中发现差异 |
| `literature_matching_metadata_changed` | digest metadata ingest | `paper/literature_item` | digest apply 的本地输入；不触发全局 discovery refresh |
| `topic_synthesis_applied` | workflow apply | `topic:topicId` | topic artifact, graph/concept proposals, freshness baseline |
| `literature_redirect_materialized` | identity/review action | `literature_item` redirect | retarget affected resolutions/edges through routing policy |
| `topic_source_check_requested` | explicit user/debug/maintenance action | `topic:topicId` | compare topic source manifest with Host Library / Artifact Facade |
| `external_source_drift_detected` | startup reconcile / debug scan | library/global or bounded examples | classify Zotero source drift before enqueueing work |
| `tag_vocabulary_changed` | tag save/import | `tag` or global | topic options/discovery policy |

### Legacy compatibility event

`reference_matching_applied` 是旧 reference matching workflow 的兼容残留，不是新的 canonical source event。它当前表示旧 workflow 或 `literature-digest.auto_reference_matching` 后处理更新了 references note 中的 reference matching baseline，因此需要刷新该 Zotero item 的 paper registry facts，并进一步让 citation graph structure 变 dirty。

治理目标是废弃这条专用事件：

- 显式旧 `reference-matching` workflow 不再作为 Synthesis reference resolution 的正式入口。
- 如果 references artifact 发生变化，canonical event 应是 `paper_artifact_changed` 或 `digest_applied`。
- 如果用户通过新 Synthesis review/action 确认 reference resolution，canonical event 应表达具体 review action 或 citation graph invalidation，而不是复用旧 workflow 事件。
- `reference_matching_applied` 在实现中只能作为 migration/compatibility 输入保留，不能出现在新设计、UI、OpenSpec 需求或 worker contract 的主路径中。

### Invalidation Event

Invalidation event 表示某个派生状态需要重算。

| Event | Owner worker | Scope | 说明 |
| --- | --- | --- | --- |
| `citation_graph_structure_dirty` | citation graph structure worker | paper/literature item | Reference facts changed |
| `citation_graph_complex_metrics_dirty` | complex metrics worker | graph/global | Structure changed |
| `citation_graph_layout_dirty` | layout worker | preset/graph hash | UI layout stale |
| `zotero_related_items_sync_dirty` | related items sync worker | paper/literature item or graph epoch | Matched library citation edges should be synced to Zotero native related items |
| `external_literature_dedupe_review` | registry/cache review worker | external literature candidates | Potential duplicate external literature items require review |
| `topic_source_check_requested` | topic source check worker | topic | Explicit source manifest check requested |
| `external_source_rebuild_required` | registry/cache maintenance | library/global | Bulk or structural Zotero drift requires explicit inspect/rebuild |
| `topic_discovery_apply_match` | digest apply-time matcher | literature item | 新 digest metadata 对 active topics 做一次 best-effort matching |
| `topic_discovery_repair_requested` | explicit repair worker | topic/literature/global bounded scope | 调试或维护命令显式要求重算 discovery hints |
| `registry_cache_rebuild_requested` | literature registry job | global | Explicit registry/graph cache rebuild |

### Job / Progress Event

Job progress is not a domain event. It records worker execution state in `synt_job_state` and feeds statusbar/popover/debug views.

Dirty events 是临时 work queue，不是 event sourcing。Synthesis 不承诺事件重放，也不以历史事件恢复业务事实；恢复和 rebuild 应从 Zotero library、artifact notes、committed DB facts、durable overrides 与显式 import/checkpoint 输入重新计算。

## Invalidation Policy 目标接口

后续可以新增 `src/modules/synthesis/invalidationPolicy.ts` 或等价模块，把薄层 routing rules 从 worker 中抽出。它不是新的领域服务，也不是跨域事实所有者；它只根据输入 change 返回允许的 invalidation/review/job/diagnostic commands。

```ts
type SynthesisRoutingInput =
  | { kind: "paper_added"; paperRef: string; literatureItemId: string }
  | { kind: "paper_artifact_changed"; paperRef: string; artifactTypes: string[] }
  | { kind: "paper_deleted"; paperRef: string; literatureItemId: string }
  | { kind: "paper_merged"; fromLiteratureItemId: string; toLiteratureItemId: string }
  | { kind: "external_literature_dedupe_candidate"; leftLiteratureItemId: string; rightLiteratureItemId: string }
  | { kind: "literature_redirect_materialized"; fromLiteratureItemId: string; toLiteratureItemId: string }
  | { kind: "digest_applied"; paperRef: string; literatureItemId: string }
  | { kind: "topic_source_check_requested"; topicId: string }
  | { kind: "external_source_drift_detected"; severity: "small" | "bulk" | "structural"; libraryId: number }
  | { kind: "registry_cache_rebuilt"; registryEpoch: string }
  | { kind: "citation_graph_changed"; graphHash: string }
  | { kind: "zotero_related_items_sync_requested"; sourceLiteratureItemIds?: string[]; graphEpoch?: string }
  | { kind: "topic_interest_metadata_changed"; topicId: string }
  | { kind: "literature_matching_metadata_changed"; literatureItemId: string };

type SynthesisRoutingResult = {
  dirtyEvents: DirtyEventDraft[];
  reviewItems: ReviewItemDraft[];
  jobRecommendations: JobRecommendation[];
  diagnostics: Diagnostic[];
  supersedeOrClear?: SupersedeCommand[];
};
```

输出应包含：

- dirty events to record；
- review items to open/supersede；
- job recommendations to show or execute through explicit command；
- supersede/clear commands for old epoch/basis queue/job state；
- diagnostics。

输出不得包含：

- semantic matching result；
- graph nodes/edges/metrics/layout；
- topic source-check changed decision from registry/cache changes；
- file scan result；
- cross-domain direct writes；
- unbounded fan-out。

## Invalidation Policy Rules

| Change | 必须影响 | 不应直接影响 |
| --- | --- | --- |
| paper added, no digest | registry cache | 不写 topic source-check changed diagnostic / dirty；不生成 discovery candidates |
| digest applied, with matching metadata | registry cache artifact state、该 literature 的 best-effort discovery candidates | 不自动加入 topic artifact；不扫描全库 literature |
| paper artifact changed | registry cache、citation graph | 不写 topic source-check changed diagnostic；不全量 topic scan |
| paper deleted | deletion review、registry binding state、graph affected slice | 不静默删除 user topic dependency；不后台写 topic source-check changed diagnostic |
| paper merged | redirect、binding state、reference retarget | 不重写 topic resolver without explicit decision；不后台写 topic source-check changed diagnostic |
| external literature dedupe candidate | strong identifier 可自动 redirect；弱/fuzzy 候选进入 P0 review | 不直接污染 reference resolution；不把 fuzzy candidate 自动 merge |
| literature redirect materialized | retarget affected reference resolutions、citation edges、related-items sync dirty | 不删除原始 review evidence；不扫描无关 topic |
| registry cache full rebuild | advance `registry_epoch`、clear/supersede old registry/cache-related queue、citation graph rebuild、bounded Zotero related items sync dirty | 不保留旧 epoch running jobs；不规划 topic source check/freshness |
| graph structure changed | complex metrics/layout stale、matched library edge related-items sync dirty | 不改变 registry cache facts；不改变 topic source-check state；不把 Zotero related items 作为 graph 输入 |
| reference resolution review action | affected citation graph slice、related-items sync for affected source when matched to Zotero-bound target | 不复用 legacy `reference_matching_applied`；不从 citeKey baseline 写 graph |
| topic source check requested | topic source manifest diagnostic | 不自动改写 topic artifact |
| external source small drift | bounded registry cache dirty events | 不扩大到 full rebuild；不触发 topic work |
| external source bulk drift | source drift incident、recommended registry/graph cache rebuild | 不逐条展开 dirty events/review items/graph jobs |
| external source structural drift | diagnostic/repair required、pause incremental fan-out | 不继续当作可信 source 处理 |
| topic interest metadata changed | 更新 topic discovery profile；影响未来 digest apply-time matching | 不改变 coverage/freshness；不回扫旧 literature |
| literature matching metadata changed | 作为 digest apply-time matching 输入 | 不参与 literature-to-literature reference matching；不触发全局 discovery |

## Epoch / Staleness 合同

目标实现应为 dirty events 和 job progress 增加轻量 epoch/basis 字段。Epoch 是本地 stale guard 和 rebuild 可见性边界，不是业务事实，不是分布式 generation，也不是 topic/index 耦合入口：

- `registry_epoch`：registry/cache facts 的 committed basis。Full registry/cache rebuild 或结构性 registry/cache 替换后递增或更换 run id。当前实现可继续映射到历史 `index_generation` 字段名，但语义应降级为 registry/cache epoch。
- `graph_epoch`：citation graph structure 的 committed basis。Graph 可以独立推进，但每个 graph result 必须记录 `basis_registry_epoch` 或等价 graph input hash，表示它基于哪个 registry/cache basis 计算。
- topic artifact version/hash：topic 领域自己的 artifact basis。它只随 topic apply/update/delete 推进，不随 registry/cache rebuild、citation graph rebuild、digest apply 或 discovery hint 变化推进。

三轨关系：

| Track | 直接输入 | 可独立推进 | 必须校验 | 不得影响 |
| --- | --- | --- | --- | --- |
| `registry_epoch` | Zotero library + artifact notes + durable registry effects | 是 | rebuild stale guard、source drift policy、saved overrides | 不推进 topic artifact version/hash |
| `graph_epoch` | committed registry/cache reference facts | 是，但必须绑定 `basis_registry_epoch` 或 input hash | final commit 时 basis 仍当前 | 不改写 registry facts；不推进 topic artifact version/hash |
| topic artifact version/hash | topic workflow output / explicit topic action | 是 | topic artifact hash / action stale guard | 不接受 registry/graph epoch 作为隐式 invalidation |

规则：

- Worker 只消费与当前 epoch/basis 兼容的 event。
- Graph worker 在 final commit 阶段校验 `basis_registry_epoch` 或 graph input hash 仍当前。若计算期间 registry/cache 已结构性替换，final commit no-op，并把 event/job 标记为 `stale_basis` / `superseded`。
- Registry/cache full rebuild 开始前，registry/citation/topic-discovery repair 相关旧 events 应 supersede 或 clear。普通 discovery 和 topic source check 不应因 registry cache rebuild 产生全量队列。
- Citation graph structure rebuild 可以创建新的 `graph_epoch`，但只能基于当前 committed `registry_epoch`。如果 registry epoch 在 graph 计算期间推进，旧 graph 结果不得提交为 ready state。
- Topic apply/update/delete 更新 topic artifact version/hash，但 registry/graph/cache 事件不得隐式更新 topic artifact version/hash。Topic 与 registry/cache 的一致性只通过显式 topic source check 或下一次 topic workflow update 表达。
- Running job 如果属于旧 epoch/basis，应被标记为 stale/cancelled，而不是继续显示 queued/running。
- UI snapshot 必须读取兼容 basis 组合：committed registry epoch + 与其匹配的 graph epoch，或旧 committed graph 加 running/stale diagnostic；不得把旧 registry rows 与新 graph rows 混合作为 ready state。
- UI popover 不展示旧 epoch job，debug inspect 可以显示。

## Worker 消费规则

| Worker | 消费 | 输出 | 预算 |
| --- | --- | --- | --- |
| Paper registry incremental | paper/Zotero/artifact source events | DB registry cache facts、graph dirty | batch + time |
| Citation graph structure | graph structure dirty | nodes/edges/light metrics | batch + time |
| Complex metrics | metrics dirty/global | complex metrics | time |
| Layout | layout dirty/UI command | preset layout state | time |
| Zotero related items sync | related-items sync dirty / explicit maintenance command | missing Zotero native related links only | matched library edge count |
| Topic source check | explicit source check request | source manifest diagnostic / coverage check | topic scope |
| Topic discovery apply-time matcher | digest applied | 该 literature 的 best-effort discovery hints | active topic count |
| Topic discovery repair | explicit debug/maintenance command | bounded discovery hint repair | bounded topic/literature set |
| Startup reconcile | no queue, startup trigger | source dirty events only for small safe drift; source drift incident for bulk/structural drift | fingerprint limit + drift thresholds |

Worker 不得把 unsafe scope 静默扩大成 full rebuild；应返回 diagnostic 和 recommended command。

## Queue 与 UI 合同

- Statusbar/popover 只展示 active epoch/basis 的 active jobs。
- Dirty queue aggregate 是 fallback；具体 backend job progress 优先。
- `completed` job 可短暂显示，但不得永久污染 UI。
- `queued` 任务必须能解释来源、scope 和下一步 worker。
- Debug list 可以显示 completed/stale/old epoch，但默认 limit 有界。

## 当前缺口

- thin event routing / invalidation policy 尚未抽出；当前 routing 规则仍分散在 service/worker 中。
- epoch/basis 字段尚未进入 dirty events/job state。
- registry/graph cache rebuild 清旧队列、弹窗保护、真实 item-level progress 仍需后续实现。
- deletion/merge 对 topic source check 的影响仍有 transitional 逻辑痕迹，目标是只在显式 topic-domain check/update 中体现。
- startup reconcile 尚未完整实现 external source drift severity、bulk no-fanout 和 structural fail-closed 合同。
- external literature dedupe 尚未建立 fixture/golden-label/experiment harness；正式 auto-merge policy 必须先通过当前库 fixture 与人工审阅 labels 验证。
