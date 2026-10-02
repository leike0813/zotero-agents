
# rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs
所属分层：[Synthesis 领域与侧车](../../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph](../../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs -->

引用图谱的持久化辅助子模块，把图 rows/state 与 attempt 终态收敛为单个 repository transaction 提交单元。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs)

## 符号（3）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs:commit_graph -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs:latest_failed_rebuild_type -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs:promote_metrics -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| commit_graph | 函数 | 53–58 | 简单 | rust、事务、持久化、citation-graph | 0 | 在单个 transaction 内提交图 rows、state、ready basis 与 attempt 终态，任一环节失败整体回滚。 |
| latest_failed_rebuild_type | 函数 | 81–100 | 简单 | rust、persistence、rebuild、查询 | 0 | 查询最近一次 failed rebuild 的模式，作为无参 retry 的唯一模式来源；canceled attempt 不参与。 |
| promote_metrics | 函数 | 60–70 | 简单 | rust、持久化、metrics、basis | 0 | 提升 metrics identity，只有与当前 graph basis 匹配才允许成为新的可读 metrics。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ports.rs](../ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |
