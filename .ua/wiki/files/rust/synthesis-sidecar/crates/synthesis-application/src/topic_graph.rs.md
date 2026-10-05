
# rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs -->

主题图谱应用层：维护主题之间的共现与邻接关系，支撑主题聚类、演进时间线与图页渲染。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs)

## 符号（7）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs:ingest_proposals -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs:rebuild_index_with_checkpoint -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs:reconcile_materialized_topics -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs:reconcile_plan -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs:TopicGraphApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs:TopicGraphComputePort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs:TopicPlanRelationProposal -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ingest_proposals | 函数 | 733–868 | 复杂 | rust、提案、准入、topic-graph | 0 | 接收关系提案并规范化为图关系候选，附带置信度与证据。 |
| rebuild_index_with_checkpoint | 函数 | 1239–1317 | 中等 | rust、索引、检查点、topic-graph | 0 | 带检查点重建图索引，检查点让大图重建可续跑。 |
| reconcile_materialized_topics | 函数 | 334–446 | 中等 | rust、对账、物化、topic-graph | 0 | 对账已物化主题与图关系，清理孤立节点并报告不一致。 |
| reconcile_plan | 函数 | 448–731 | 复杂 | rust、对账、计划、topic-graph | 0 | 对账主题计划：比较计划声明与实际图关系差异，产出待处理的提案与撤销项。 |
| TopicGraphApplication | 类 | 244–249 | 简单 | rust、A、p、l | 0 | 主题图谱应用层 owner：管理关系提案、审阅、计划执行与物化主题的准入与提交。 |
| TopicGraphComputePort | 类 | 234–240 | 简单 | rust、P、o、r | 0 | 主题图计算端口：声明共现与邻接计算能力，保持 application 与算法实现解耦。 |
| TopicPlanRelationProposal | 类 | 203–215 | 简单 | rust、P、r、o | 0 | 计划内关系提案：描述一次主题计划将要建立或撤销的图关系。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [admission.rs](admission.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs | 定义应用层的准入（admission）通用类型：写入操作的 admission scope、去重键与重放基础判定，是所有领域应用共享的入口事实源。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [topic.rs](topic.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs | Topic 领域应用层：管理主题 identity、成员变更、合并与查询，并结合 concept KB 与 topic graph 投影跨域主题视图。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| TopicGraphApplication | 类 | 244–249 | 主题图谱应用层 owner：管理关系提案、审阅、计划执行与物化主题的准入与提交。 |
| TopicGraphComputePort | 类 | 234–240 | 主题图计算端口：声明共现与邻接计算能力，保持 application 与算法实现解耦。 |
| TopicPlanRelationProposal | 类 | 203–215 | 计划内关系提案：描述一次主题计划将要建立或撤销的图关系。 |
