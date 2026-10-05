
# rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs -->

Topic 领域应用层：管理主题 identity、成员变更、合并与查询，并结合 concept KB 与 topic graph 投影跨域主题视图。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs)

## 符号（6）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs:apply_after_receipt -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs:ParsedApply -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs:rebuild -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs:resolve -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs:TopicApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs:TopicOperation -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apply_after_receipt | 函数 | 1208–1588 | 复杂 | rust、admission、apply、topic | 0 | 在收到 receipt 后继续执行 apply 的剩余步骤，避免提前提交造成不可回滚状态。 |
| ParsedApply | 类 | 1766–1784 | 简单 | rust | 0 | 解析后的 apply 载荷：把外部 apply 请求解析为已验证的领域变更集合。 |
| rebuild | 函数 | 1787–1949 | 复杂 | rust、重建、topic、投影 | 0 | 重建主题派生视图与就绪度投影，保证 topic、concept KB 与 topic graph 结论一致。 |
| resolve | 函数 | 859–953 | 中等 | rust、解析、topic、身份 | 0 | 解析主题标识与范围，把外部输入转换为已验证的领域主题身份。 |
| TopicApplication | 类 | 293–304 | 简单 | rust、A、p、l | 0 | Topic 应用层 owner：管理主题 identity、成员变更、合并与就绪度投影，并结合 concept KB 与 topic graph 组装跨域视图。 |
| TopicOperation | 类 | 1750–1754 | 简单 | rust | 0 | 主题操作记录：应用操作的持久化身份与终态，保证并发写入可判定唯一执行者。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [concept_kb.rs](concept_kb.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs | 概念知识库（Concept KB）应用层：维护概念 identity、别名归一与知识条目准入，向 topic 层提供概念维度的事实来源。 |
| [dto.rs](dto.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs | 应用层跨边界 DTO 集合：定义 Workbench、Topic、Citation Graph 等对外投影视图与 wire 结构，作为宿主与 Workbench 的唯一契约来源。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |
| [topic_graph.rs](topic_graph.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs | 主题图谱应用层：维护主题之间的共现与邻接关系，支撑主题聚类、演进时间线与图页渲染。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ParsedApply | 类 | 1766–1784 | 解析后的 apply 载荷：把外部 apply 请求解析为已验证的领域变更集合。 |
| TopicApplication | 类 | 293–304 | Topic 应用层 owner：管理主题 identity、成员变更、合并与就绪度投影，并结合 concept KB 与 topic graph 组装跨域视图。 |
| TopicOperation | 类 | 1750–1754 | 主题操作记录：应用操作的持久化身份与终态，保证并发写入可判定唯一执行者。 |
