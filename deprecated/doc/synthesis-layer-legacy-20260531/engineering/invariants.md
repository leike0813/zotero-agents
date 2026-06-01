# Synthesis Invariants

本文档列出 Synthesis Layer 的工程不变量。机器可读版本见 [invariants.yaml](./schemas/invariants.yaml)。

## 严重级别

| Severity | 含义 |
| --- | --- |
| `fatal` | 违反后会破坏数据边界、用户决策或核心读模型，必须阻止合并或发布 |
| `error` | 违反后会造成可见错误或状态污染，必须在同一 change 修复 |
| `warning` | 违反后会造成可诊断的退化，可进入 backlog 但必须明确记录 |
| `info` | 设计提示或未来自动化线索 |

## 核心不变量

| ID | Severity | Statement |
| --- | --- | --- |
| `inv.ui.db_first_hot_path` | `fatal` | Workbench UI hot paths must read DB-backed runtime state only. |
| `inv.files.no_data_synthesis_hot_write` | `fatal` | Normal runtime workers and Workbench snapshots must not write `data/synthesis/**`. |
| `inv.override.rebuild_preserves_effects` | `fatal` | Full rebuild must not silently drop active durable effects / user overrides. |
| `inv.queue.old_epoch_not_active` | `fatal` | Old epoch/basis dirty events and jobs must not appear as active UI work. |
| `inv.graph.library_nodes_not_truncated` | `fatal` | Citation Graph UI snapshot must include all active Zotero-bound library nodes. |
| `inv.graph.layout_not_structure_gate` | `error` | Missing/running layout must not hide existing graph structure. |
| `inv.graph.related_items_sync_one_way` | `fatal` | Zotero native related items sync must be one-way add-only from matched library citation edges to Zotero, never an input to reference resolution or graph facts. |
| `inv.identity.external_dedupe_benchmark_required` | `fatal` | External literature auto-merge policy must be selected from fixture-based golden labels and experiments, not from unvalidated hand-written rules. |
| `inv.identity.redirect_before_graph` | `fatal` | Citation graph edges must target canonical literature items after applying active literature redirects. |
| `inv.topic.discovery_not_freshness` | `fatal` | Discovery candidates must not write topic source-check changed diagnostics by themselves. |
| `inv.registry_cache.not_global_ssot` | `fatal` | Paper Registry Cache must not be treated as the global Synthesis SSOT for Topics, Tags, Concepts, or workflow artifacts. |
| `inv.topics.index_not_driver` | `fatal` | Registry cache dirty events, startup reconcile, and registry/graph cache rebuild must not enqueue normal topic source-check / freshness diagnostic work. |
| `inv.topics.workflow_uses_source_facade` | `fatal` | Topic create/update primary inputs must come from the Host Library / Artifact Facade; Citation Graph metrics are optional enrichment. |
| `inv.external_source.ingress_validation` | `fatal` | Zotero item/note/artifact inputs must be defensively validated at adapter/materializer ingress. |
| `inv.external_source.bulk_drift_no_fanout` | `fatal` | Startup reconcile must not expand bulk or structural Zotero drift into unbounded dirty events, graph jobs, review items, or topic work. |
| `inv.external_source.structural_drift_fail_closed` | `fatal` | Structural Zotero drift must pause incremental processing and require explicit inspect/repair. |
| `inv.discovery.apply_time_only` | `fatal` | Normal discovery hints are generated only by literature-digest apply-time matching or explicit repair, not by Workbench snapshots or registry cache rebuild. |
| `inv.discovery.filtered_suppression` | `error` | Filtered topic-literature pairs must not reopen because of digest rerun, metadata hash drift, or registry cache rebuild. |
| `inv.discovery.best_effort_cap` | `warning` | Apply-time discovery must be bounded and must not scan all topic-literature pairs except through explicit repair. |
| `inv.progress.no_fake_percent` | `error` | Determinate progress requires real `current/total`; otherwise use phase or indeterminate. |
| `inv.review.item_not_override` | `fatal` | A resolved review item alone is not a durable override unless a domain-local durable effect is recorded. |
| `inv.import.preview_first` | `fatal` | File import must run preview before apply. |
| `inv.tx.no_partial_domain_commit` | `fatal` | A domain write transaction must not expose partially materialized facts. |
| `inv.snapshot.consistent_basis` | `error` | A Workbench snapshot must represent compatible committed registry/graph basis or explicitly retry/diagnose. |
| `inv.performance.bounded_hot_reads` | `error` | Workbench, MCP, and Host Bridge hot reads must obey bounded query, pagination, and truncation contracts. |
| `inv.persistence.corruption_no_silent_reset` | `fatal` | SQLite runtime corruption must enter explicit recovery and must not silently reset, overwrite, or import legacy JSON. |
| `inv.worker.stale_guard_required` | `fatal` | Worker final commits must validate in-progress marker ownership and source/basis version. |
| `inv.review.stale_guard_required` | `fatal` | Review actions must compare evidence/version before materializing effects; evidence does not invalidate saved overrides during rebuild. |
| `inv.rebuild.no_partial_rebuild_visibility` | `fatal` | Failed or incomplete rebuild runs must not become UI committed state. |
| `inv.worker.running_recovered_on_startup` | `error` | Dirty events/jobs left running by a previous Zotero/plugin session must be recovered on startup. |
| `inv.apply.after_commit_failure_boundary` | `error` | After-commit side-effect failure must not roll back already committed core facts. |

## 验证口径

第一版不实现自动 runner，但每条 invariant 都应能映射到至少一种证据：

- source inspection：代码路径不读取/写入禁止路径；
- repository snapshot：DB rows 满足状态约束；
- UI snapshot：snapshot DTO 不包含旧路径、旧 epoch/basis、错误状态；
- debug capability：diagnostics 暴露 invariant 相关计数；
- unit/integration test：构造状态并断言行为；
- manual runbook：危险操作有确认和结果摘要。

## 变更规则

- 删除或降低 `fatal` invariant 前必须更新对应 governance 文档，并解释替代保护。
- 新增 worker、review action、override/effect kind、job source、import/export 行为时，应检查是否需要新增 invariant。
- Invariant 不应锁定内部函数调用顺序；它应表达用户可见或数据一致性层面的性质。
