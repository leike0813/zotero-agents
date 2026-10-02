
# rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs -->

Citation Graph 应用层唯一 owner：管理图快照、重建 attempt 生命周期、basis-bound 读视图、metrics/layout identity 与图级持久化协调。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs)

## 符号（10）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs:CitationGraphApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs:CitationGraphComputePort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs:CitationMetricsPageRequest -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs:CitationRebuildRequest -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs:finish_rebuild -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs:prepare_rebuild -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs:project_citation_graph_default_with_limits -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs:rebuild -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs:recompute_layout_with_checkpoint -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs:validate_rebuild -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CitationGraphApplication | 类 | 292–299 | 简单 | rust、A、p、l | 0 | Citation Graph 应用唯一 owner：管理图快照、重建 attempt 生命周期、metrics/layout identity 与图级持久化协调。 |
| CitationGraphComputePort | 类 | 262–282 | 简单 | rust、P、o、r | 0 | 引用图计算端口：把图 build、metrics 与 layout 计算隔离到可替换的纯计算实现，application 不持有 SQL 与锁。 |
| CitationMetricsPageRequest | 类 | 235–241 | 简单 | rust | 0 | 引用指标分页请求，定义排序、窗口与分页参数，驱动 metrics 读视图。 |
| CitationRebuildRequest | 类 | 209–214 | 简单 | rust | 0 | 图重建请求：携带模式（Full/Incremental）与触发上下文，作为每次 rebuild dispatch 的输入。 |
| finish_rebuild | 函数 | 465–507 | 中等 | rust、rebuild、状态机、attempt | 0 | 收敛一次 rebuild attempt：成功、收集失败、compute 失败、取消与 basis mismatch 都在此形成终态。 |
| prepare_rebuild | 函数 | 418–451 | 简单 | rust、rebuild、规划、citation-graph | 0 | 重建前的规划阶段：根据当前 cache、Reference 与 Host facts 选择 Full/Incremental 模式并生成新的 opaque attempt。 |
| project_citation_graph_default_with_limits | 函数 | 50–169 | 中等 | rust、投影、有界读取、citation-graph | 0 | 按有界 limit 投影引用图默认视图，限制节点与边数量以避免全库规模 projection。 |
| rebuild | 函数 | 509–702 | 复杂 | rust、rebuild、事务、citation-graph | 0 | 图重建主流程：委派 compute port 生成 rows 与 metrics，并在同一 repository transaction 内提交 graph、state 与 attempt 终态。 |
| recompute_layout_with_checkpoint | 函数 | 731–768 | 中等 | rust、layout、检查点、citation-graph | 0 | 带检查点重算图布局 identity，布局未变化时复用既有结果以避免无谓提交。 |
| validate_rebuild | 函数 | 903–944 | 中等 | rust、校验、rebuild、citation-graph | 0 | 校验重建请求的输入与当前 basis 是否一致，ready cache 与无失败模式时直接返回 unavailable。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| CitationGraphApplication | 类 | 292–299 | Citation Graph 应用唯一 owner：管理图快照、重建 attempt 生命周期、metrics/layout identity 与图级持久化协调。 |
| CitationGraphComputePort | 类 | 262–282 | 引用图计算端口：把图 build、metrics 与 layout 计算隔离到可替换的纯计算实现，application 不持有 SQL 与锁。 |
| CitationMetricsPageRequest | 类 | 235–241 | 引用指标分页请求，定义排序、窗口与分页参数，驱动 metrics 读视图。 |
| CitationRebuildRequest | 类 | 209–214 | 图重建请求：携带模式（Full/Incremental）与触发上下文，作为每次 rebuild dispatch 的输入。 |
