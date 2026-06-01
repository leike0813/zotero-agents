# Synthesis Performance and Scale Model

本文档定义 Synthesis Layer 的桌面端性能模型、规模边界、SQLite 查询预算、worker budget、分页策略和 external source drift 阈值。它不是性能测试报告，而是实现、测试和 debug diagnostics 共同引用的目标合同。

机器可读版本见 [performance.yaml](./engineering/schemas/performance.yaml)。

## 设计目标

- 普通 Workbench read path 在目标数据规模内保持交互式响应。
- Worker 通过 batch/time budget 让出主线程和 UI，不用长事务换吞吐。
- Registry/cache 与 Citation Graph 可以支持较大的本地文献库，但超过边界时系统进入 degraded/diagnostic 模式，而不是隐式扫描全量数据。
- Performance budget 是工程合同。实现如果需要突破预算，必须更新本文档和对应 YAML，而不是在代码里散落 magic number。

## 规模分层

| 层级 | Zotero-bound literature | Reference instances | External literature/work records | Topics | 语义 |
| --- | ---: | ---: | ---: | ---: | --- |
| `normal` | <= 2,000 | <= 100,000 | <= 60,000 | <= 40 | 普通个人库，应保持流畅 |
| `target` | <= 10,000 | <= 500,000 | <= 300,000 | <= 100 | 主要设计目标，必须有分页和 worker budget |
| `stress` | <= 25,000 | <= 1,250,000 | <= 750,000 | <= 250 | 可诊断、可重建，但不承诺所有 UI 交互实时 |
| `out_of_policy` | above stress | above stress | above stress | above stress | 进入 degraded mode，提示显式筛选、导出或 debug 分析 |

这些数字是初始工程预算，不是产品承诺。后续真实用户库和 synthetic benchmark 可以校准它们。

## UI Read Budgets

| Read path | Target p95 | 上限策略 |
| --- | ---: | --- |
| Workbench snapshot assembly | 500 ms | 重型 diagnostics 延迟加载；列表分页 |
| Home / Registry table page | 250 ms | page size <= 100；count 可缓存或近似 |
| Cleanup / Review rows | 250 ms | 默认 limit <= 100；按 severity/status 索引 |
| Topic list/options | 250 ms | 只读 topic DB rows，不回扫 registry/cache |
| Graph default snapshot | 750 ms | semantic slice；全量 library nodes + shared external；hover-only leaf 延迟 |
| Job popover | 150 ms | active jobs <= 50；recent/completed debug-only 分页 |
| Debug list | 1000 ms | 默认 limit 100，上限 1000，必须标记 truncated |

普通 UI 不得为了满足一次 read path 而扫描 `data/synthesis/**`、重建 derived state、运行 graph layout、运行 source check、做 discovery matching 或启动 worker。

## SQLite Query and Index Strategy

Repository API 应使用 typed, indexed query，而不是取出 JSON blob 后在内存中过滤。

必需索引类别：

| 表/领域 | 必需索引 |
| --- | --- |
| Zotero binding | `(library_id, item_key)` unique；`literature_item_id` |
| Literature identifier | `(kind, normalized_value)`；`literature_item_id` |
| Artifact state | `(literature_item_id, artifact_type)` |
| Reference instance | `source_literature_item_id`；`raw_reference_hash`；`parsed_title_key` |
| Reference resolution | `reference_instance_id`；`target_literature_item_id`；`status` |
| Citation edge | `source_literature_item_id`；`target_literature_item_id`；`status`；`graph_epoch` / input hash |
| Citation layout | `(preset, graph_hash)` |
| Topic discovery hint | `(topic_id, literature_item_id)`；`status` |
| Review item | `(domain, status, severity)`；`scope_kind/scope_ref` |
| Dirty event | `(status, event_type, scope_kind, scope_ref)`；optional `basis_epoch/source_hash`；`next_retry_at` |
| Job state | `(status, source, updated_at)`；`run_id` |

事务预算：

- 写事务目标 <= 100 ms，超过 250 ms 必须输出 timing diagnostic。
- 写事务内禁止 Zotero IO、文件 IO、网络 IO、LLM/skill 调用、layout/metrics 长计算。
- 长计算先在事务外生成 delta，再用短事务 commit，并校验 in-progress marker、basis/source version。

内存策略：

- Workbench snapshot 不应 materialize 全库 reference instances。
- Graph snapshot 不应常驻所有入度 1 external leaf；这些节点只作为 hover/search 延迟数据。
- Debug raw rows 默认关闭；开启后仍受 limit/truncated 约束。

## Worker Budgets

默认 worker tick budget：

| Worker | Batch limit | Time budget | Progress total |
| --- | ---: | ---: | --- |
| Paper registry incremental | 25 papers | 2000 ms | started paper events |
| Startup reconcile fingerprint scan | 500 Zotero items per tick | 2000 ms | scanned Zotero items |
| Citation graph structure | 1000 reference instances | 2000 ms | started reference instances / sources |
| Citation graph complex metrics | phase bounded | 3000 ms | fixed phases or metric rows |
| Citation graph layout | 2000 default graph nodes | 3000 ms | layout nodes or fixed phases |
| Zotero related items sync | 100 matched library edges | 2000 ms | candidate edges |
| Topic discovery apply-time match | active topics for one literature | 2000 ms | active topic count |
| Topic discovery repair | 500 topic-literature pairs | 2000 ms | bounded pairs |
| Topic source check | 1 topic | 2000 ms | saved source count |
| Import preview/apply | 1000 rows/files per tick | 3000 ms | input rows/files |

Worker 如果预算耗尽，应保存 progress `updated_at` 并让出执行权；不得把 scoped work 静默扩大成 full rebuild。

## External Source Drift Thresholds

Startup reconcile 是 bounded detector。它用阈值把 Zotero source drift 分成三类：

| Severity | 阈值 | 行为 |
| --- | --- | --- |
| `small` | changed/deleted/updated items <= 50 且 <= 5% active library；decode failure ratio < 2%；fingerprint scan 在预算内 | 允许生成 bounded dirty events |
| `bulk` | changed/deleted/updated items > 50 或 > 5%；批量 merge/delete/update；scan 超过 soft budget 但没有结构异常 | 记录 drift incident，推荐 explicit registry/graph cache rebuild，不逐条 fan-out |
| `structural` | binding collision；parent/note 结构不可能；decode failure ratio >= 2%；fingerprint scan hard timeout；Zotero DB/API 返回不一致 | fail-closed，暂停增量 fan-out，要求 inspect/repair |

Bulk/structural drift 不能生成大量 per-item queued jobs、review rows、graph jobs、topic source-check 或 discovery work。

## Pagination and Truncation

- 普通 list page size 默认 50，上限 100。
- Debug list 默认 limit 100，上限 1000。
- Graph UI 默认不得截断 library nodes；但 external leaf、debug rows、diagnostics examples 必须有界。
- 任何被截断的 snapshot DTO 必须返回 `truncated: true` 和 limit metadata。
- UI 文案应表达“显示的是当前筛选/切片”，不能暗示系统丢失事实。

## Acceptance and Diagnostics

Performance failures should return bounded diagnostics:

- contract id, such as `perf.workbench.snapshot.p95`；
- dataset scale summary；
- slow query or phase label；
- limit/truncation metadata；
- recommended command, index hint, or degraded-mode explanation。

Debug capabilities may expose absolute paths only when `includeLocalPaths: true`。Performance diagnostics must not include tokens, local profile internals, full note HTML, or unbounded raw rows。

## Current Implementation Gaps

- Synthetic 1k/10k performance tests exist in prior change scope, but the main Synthesis docs did not define shared budget numbers.
- Startup reconcile has small/bulk/structural semantics in docs, but threshold constants still need implementation alignment.
- Query/index coverage should be audited against repository migrations before budgets become CI gates.
- DB corruption recovery is defined in persistence/recovery contracts, but restore UI and quarantine tooling still need implementation.
