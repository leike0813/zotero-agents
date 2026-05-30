# Synthesis 持久化与动作边界重设计：实施总则

## 目的

本文是 `artifact/synthesis_persistence_and_action_boundary_redesign_20260526.md` 的实施总则子工件。它不重复完整领域设计，而是锁定后续分期实现必须共同遵守的原则，避免每个阶段各自局部优化后再次出现热路径、review 语义和后台任务边界不一致的问题。

## 总体架构原则

1. **SQLite-first local working state**
   - `state/zotero-agents.db` 是 Synthesis 运行态的本地事实源。
   - UI、MCP、Host Bridge、review action、后台 worker 默认读写 SQLite。
   - 不再把 `data/synthesis/**` JSON 文件作为高频交互和后台维护的主路径。

2. **JSON canonical / checkpoint 是冷路径**
   - `data/synthesis/` 保留为 import / export / checkpoint / audit / future sync 边界。
   - 普通 review action、Index update、Citation Graph update、Topic / Concept / Tag 编辑不逐次写 JSON 小文件。
   - JSON import / export 必须是显式命令，不在插件启动时自动迁移。

3. **Typed repository 替代 JSON blob**
   - Synthesis 高频状态不得继续塞入 `plugin_task_rows.payload_json`。
   - Repository 层负责 schema migration、transaction、indexed query、pagination、bounded DTO assembly。
   - 事务失败必须回滚，不允许部分 DB 状态和 UI summary 分裂。

4. **Read-path purity**
   - UI/MCP/Host Bridge read API 只能读取已有 DB state。
   - read path 不扫描 JSON canonical、不触发 rebuild、不 enqueue job、不刷新 freshness、不运行 BM25 discovery。
   - 缺失或 stale 时返回 bounded diagnostics 和 recommended command。

## Index 与身份原则

1. **统一 `literature_item` 模型**
   - Zotero 库内文献和 references 引出的外部文献使用同一实体模型。
   - Zotero item 是 `literature_item` 的 binding，不是另一套实体。
   - reference instance 通过 resolution 指向 `literature_item`。

2. **主键无语义**
   - `literature_item_id` 使用不可变 surrogate key，例如 `lit:<ulid>`。
   - DOI、URL、arXiv、citeKey、title、normalized title、agent metadata、embedding 均不能作为主键。

3. **normalized title 是弱身份信号**
   - 只由 host deterministic normalizer 生成。
   - 不做翻译、不做语义判断、不做 stopword / stemming、不排序 token。
   - 可用于候选召回，不得加全局唯一约束。

4. **Hash 不能替代文本**
   - 需要检索、排序、解释、复审或容忍小扰动的字段必须保留文本。
   - Hash 只用于 integrity、dirty detection、short filename、exact duplicate acceleration 等场景。

## Review action 原则

1. **Review action 必须改变领域事实**
   - 成功返回不能只表示 `review_item.status` 改了。
   - Action 必须在同一事务中更新 domain facts、review state、Index summary、Citation Graph structure / lightweight metrics 和下游 dirty signal。

2. **Review 有层级**
   - P0：identity / binding review，例如 Zotero deletion、dedupe / merge、literature item merge。
   - P1：reference resolution review，例如 match existing、create external item、ignore reference。
   - P2：metadata / freshness / diagnostics review。
   - P0 未解决时，依赖它的 P1 review 不应作为可操作项展示。

3. **P0 action 后必须维护依赖**
   - Bounded review dependency maintenance 只处理受影响 source / target item。
   - 必须 retarget、supersede、unblock 或 dedupe 相关 P1 reviews。
   - 不允许全库扫描作为默认 fallback。

4. **UI 语义必须面向用户决策**
   - Index 不再使用泛化 `Cleanup Queue` 作为主文案。
   - Reference review 应说明来源文献、reference 内容、建议目标和动作后果。
   - Deletion / dedupe review 应说明这是普通删除、去重迁移还是暂缓处理。

## Citation Graph 原则

1. **Structure 是 Index 的同步投影**
   - Index 写事务如果影响 references / resolutions / bindings，必须同步更新 Citation Graph structure。
   - Lightweight metrics 随 structure 同步更新。

2. **Complex metrics 与 layout 可以滞后**
   - Complex metrics 由低优先级 worker 更新。
   - Layout 只由 Graph UI 或显式 recompute 触发。
   - Read APIs 不触发 layout 或 metrics rebuild。

3. **Graph reads 必须 bounded**
   - UI / MCP 读取 slice、metrics、neighborhood，不默认组装全量 graph JSON。
   - 全量 graph export 属于 checkpoint / diagnostic 命令，不是普通 read path。

## Topic freshness 与 Discovery 原则

1. **Known dependency 与 discovery 分离**
   - 已关联 literature item 变化标记 known dependency dirty。
   - 新文献可能相关只生成 discovery hint，不把所有 topic 标记 stale。

2. **Metadata 合同最小化**
   - `literature_matching_metadata`：`key_terms`、`methods`、`problems`、`datasets`、`exclude_terms`。
   - `topic_interest_metadata`：`include_terms`、`must_have_terms`、`methods`、`exclude_terms`、`seed_literature_item_ids`。
   - Hint 只服务候选召回和 UI 提示，不自动改写 topic。

3. **Topic artifact 不后台改写**
   - Freshness 只影响 UI 提示和 update workflow 可用性。
   - 任何 topic 正文更新必须通过明确 workflow。

## 生命周期与清理原则

1. **Tombstone 有边界**
   - 普通 tombstone 建议 90 天后 eligible。
   - Merge / redirect tombstone 至少保留 180 天。
   - 仍被 review、reference、topic usage 或 redirect 依赖的 tombstone 不 purge。

2. **Zotero 管理资产不由插件删除**
   - Digest note / attachment / embedded-image 由 Zotero 管理。
   - 插件只维护 artifact metadata、availability 和 diagnostics。

3. **Checkpoint cleanup 独立于 runtime cleanup**
   - `data/synthesis/` 中 checkpoint / export 可由专门维护入口清理。
   - 普通 runtime cleanup 不混删 cold-path 文件。

## 后台 Job 与 Profiler 原则

1. **Worker 消费 dirty queue**
   - Worker 必须遵守 batch / time budget。
   - Unsafe scope 只标 stale + recommended repair，不自动 full rebuild。

2. **Profiler 只在 debug mode 启用**
   - 复用项目已有 debug mode，不新增 prefs 或 UI。
   - 关闭时为近似零开销 no-op。
   - 使用独立 `state/debug/synthesis-job-profiler.db`。
   - 不进入主业务 DB、checkpoint、Git Sync 或迁移。

## 验收原则

- 每个阶段必须保持 UI/MCP read path 可用。
- 每个阶段必须有最小可观察行为验证，而不是只验证内部调用顺序。
- 性能测试失败应输出耗时分解。
- 不新增 npm 依赖。
- 不启动自动生产迁移。
