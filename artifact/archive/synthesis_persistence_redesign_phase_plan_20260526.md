# Synthesis 持久化与动作边界重设计：分期计划

## 目的

本文是 `artifact/synthesis_persistence_and_action_boundary_redesign_20260526.md` 的分期计划子工件。目标是把大型 DB-first 重设计拆成可单独验收的阶段，避免一次性改动过大导致 UI/MCP 不可用、review 语义漂移或后台任务性能继续失控。

## 分期原则

- 每一期都必须保持 Workbench、MCP read-only 和 Host Bridge 基本可用。
- 先建立 repository 和 Index 事实层，再迁 Citation Graph、Topic discovery、Concept / Tag。
- 每一期只允许一个主要 source of truth 迁移目标，避免同一阶段同时改 UI、DB、worker、skill 合同和导入脚本。
- JSON cold path 迁移在热路径稳定后做，不作为早期阶段阻塞项。
- Profiler 作为 debug-only 辅助设施，可在 worker 阶段同步接入，但不应成为用户功能。

## Phase 0：OpenSpec 与设计锁定

目标：把设计基线从讨论工件同步到 OpenSpec change。

范围：

- 同步 `proposal.md`、`design.md`、`tasks.md`。
- 更新 delta specs，覆盖 SQLite-first、Index、Citation Graph、MCP、Workbench、persistence governance。
- 将主设计工件拆出实施总则和分期计划。

验收：

- `openspec validate "redesign-synthesis-persistence-for-performance" --strict` 通过。
- 设计工件和 OpenSpec change 不再互相矛盾。

## Phase 1：SQLite Repository Foundation

目标：建立 Synthesis typed repository，不迁移业务读写。

范围：

- 新增 Synthesis repository / migration layer。
- 建立 schema meta、transaction helper、query / pagination helper。
- 建立 base tables：dirty events、job state、review queue、literature items、identifiers、Zotero bindings、reference instances、reference resolutions。
- 保留现有 JSON hot path 行为，避免第一阶段破坏 UI。

非目标：

- 不迁 Workbench Index。
- 不迁 Citation Graph。
- 不改 skill 合同。

验收：

- migration 幂等。
- transaction rollback 正确。
- indexes 存在。
- Synthesis 高频状态不要求依赖 `plugin_task_rows.payload_json`。

## Phase 2：Index DB-first 与 Review Action Closure

目标：把 Index 和 reference resolution review 迁到 DB-first，并修复 review action 只改状态的问题。

范围：

- `literature_item`、identifiers、Zotero bindings、artifact metadata、reference instances、reference resolutions、review items 写入 SQLite。
- `getPaperRegistry()`、Workbench Index、MCP registry tools 改读 DB。
- Index UI read model 支持 Zotero-bound top-level rows、展开 references、Only referenced literature。
- Cleanup 语义替换为 reference match / create index item / ignore / defer。
- Zotero deletion / dedupe review 接入 P0 优先级。
- P0 action 后执行 bounded review dependency maintenance。

非目标：

- 不实现 Citation Graph complex metrics。
- 不实现 BM25 discovery。
- 不做全域 JSON checkpoint export。

验收：

- Reference review action 后，下一次 snapshot 无需 projection rebuild 即可看到 Index 事实变化。
- Zotero deletion / dedupe review 会 block / retarget / supersede 依赖的 reference reviews。
- ignored references 不进入普通 Index / Graph，但可在 detail / audit 中看到。

## Phase 3：Citation Graph DB-native Structure

目标：把 Citation Graph structure 与 lightweight metrics 改成 Index 的同步 DB 投影。

范围：

- 建立 citation nodes、edges、source ownership、incoming groups、lightweight metrics 表。
- Index 写事务同步更新 affected graph structure 和 lightweight metrics。
- Graph slice、metrics、Workbench graph 读取 bounded DB DTO。
- 移除大型 JSON graph projection 的热路径依赖。

非目标：

- 不做 layout on-demand 的 UI 改造。
- 不做 complex metrics 完整优化。
- 不实现全库 graph export 热路径。

验收：

- Reference resolution 变化会同步改变 graph structure。
- ignored reference 不参与有效 graph structure。
- Graph read path 不扫描 JSON、不触发 rebuild。

## Phase 4：Complex Metrics、Layout Boundary 与 Worker Budget

目标：把 Citation Graph 的重计算边界稳定下来。

范围：

- Complex metrics 改为低优先级 worker。
- Layout 仅 Graph UI 或显式 recompute 触发。
- Worker 使用 DB dirty queue、batch limit、time budget 和 retry。
- unsafe scope 只标 stale + recommended repair。

非目标：

- 不实现新的布局算法。
- 不引入外部 graph / metrics 依赖。

验收：

- structure/lightweight metrics 可以先完成，complex metrics 可滞后。
- layout 不由 read path 或 Index 写事务触发。
- worker 不 fallback full rebuild。

## Phase 5：Topic Freshness 与 BM25 / Metadata Hints

目标：建立轻量 topic discovery 机制，替代新增文献后对所有 topic 重跑 resolver。

范围：

- `literature_matching_metadata` 最小合同入库。
- `topic_interest_metadata` 最小合同入库。
- 更新 `literature-digest`、`create-topic-synthesis`、`update-topic-synthesis` 的输出合同。
- 建立 BM25 / equivalent discovery hint 状态。
- 区分 known dependency freshness 和 discovery hints。

非目标：

- 不自动改写 topic artifact。
- 不要求 embedding。
- 不把 hint 等同于 topic usage。

验收：

- Digest apply 更新 literature matching metadata。
- Topic synthesis apply 更新 topic interest metadata。
- 新文献只生成相关 candidate hints，不把所有 topic 标 stale。
- `getTopicContext()` 和 UI/MCP read path 不运行 discovery。

## Phase 6：Topic / Concept / Tag Runtime DB-first

目标：把 Topic Graph、Concept KB、Tag Vocabulary 的运行态从 JSON hot path 迁到 SQLite。

范围：

- Topic Graph nodes、edges、review items 存入 DB。
- Concept records、senses、aliases、relations、review items 存入 DB。
- Tag Vocabulary rows、aliases、abbrevs、validation state 存入 DB，并保持 TagVocab protocol import/export。
- Workbench Topics / Concepts / Tags 读 DB view model。

非目标：

- 不扩展复杂图编辑器。
- 不扩展 Concept semantic merge。
- 不改变 TagVocab 协议。

验收：

- Concepts / Topics / Tags tab 不扫描 JSON canonical。
- Review actions 同事务更新 DB 状态。
- JSON export 仍为显式 checkpoint。

## Phase 7：JSON Import / Export / Checkpoint

目标：让现有开发 / 测试数据能导入 DB，并保留未来 sync / audit 边界。

范围：

- dry-run / apply import：从当前 `data/synthesis/` JSON canonical / projection 读取并填充 SQLite。
- verify-only：比较 DB counts / hashes 与 checkpoint assets。
- SQLite-to-JSON checkpoint export。
- checkpoint cleanup 入口设计。

非目标：

- 不做生产自动迁移。
- 不删除旧 JSON 数据。
- 不实现 Git Sync。

验收：

- 现有测试环境数据可导入 DB。
- 导入后 Workbench 能显示 Index、Topics、Concepts、Tags、Graph。
- DB checkpoint 可导出为 JSON cold-path assets。

## Phase 8：Debug-only Job Profiler 与性能验收

目标：为后台 job 性能问题提供可解释诊断，而不是靠猜。

范围：

- 复用项目已有 debug mode。
- 新增独立 `state/debug/synthesis-job-profiler.db`。
- 记录 job run、phase、counters、diagnostics。
- 仅覆盖后台 jobs，不覆盖 UI profiler。
- 添加 synthetic 1k / 10k paper benchmark。

非目标：

- 不新增用户 UI。
- 不新增 prefs。
- 不设计 TTL / cleanup。
- 不把 profiler 数据写入主业务 DB。

验收：

- debug mode off 时 profiler 近似零开销 no-op。
- debug mode on 时 slow / failed job 能写独立 profiler DB。
- 性能测试失败输出耗时分解。

## 推荐实施节奏

优先顺序：

1. Phase 0-2：先让 Index DB-first 和 review action 闭环可用。
2. Phase 3-4：再让 Citation Graph 与 Index 一致，控制重计算成本。
3. Phase 5：接 topic freshness / discovery，避免新增文献导致 n × m resolver 成本。
4. Phase 6：迁 Topic / Concept / Tag runtime。
5. Phase 7：补 import / export / checkpoint。
6. Phase 8：在 worker 稳定后补 debug profiler 和大规模验收。

如果实现中发现某阶段风险过大，应继续拆分 OpenSpec changes，但不得跳过 SQLite-first、read-path purity 和 review transaction semantics 三条总原则。
