
# rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs -->

文献身份匹配：基于标题、作者、年份与标识符计算候选并给出置信度评分，为 canonical 身份收敛提供决策依据。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs)

## 符号（6）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs:apply_with_checkpoint -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs:plan_review -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs:prepare -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs:ReferenceMatcherOutcome -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs:ReferenceMatcherPort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs:ReferenceMatchingApplication -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apply_with_checkpoint | 函数 | 493–563 | 中等 | rust、admission、检查点、身份匹配 | 0 | 带检查点应用匹配决策，checkpoint 保证批量应用可续跑且不重复生效。 |
| plan_review | 函数 | 814–962 | 复杂 | rust、审阅、规划、身份匹配 | 0 | 规划人工审阅批次，按处置类型与置信度分组成可执行的审阅项。 |
| prepare | 函数 | 341–483 | 复杂 | rust、匹配、prepare、身份匹配 | 0 | 准备匹配：生成候选集与初始处置建议，不做持久化写入。 |
| ReferenceMatcherOutcome | 类 | 121–141 | 简单 | rust | 0 | 匹配结果：给出每个候选的置信度、匹配种类与处置建议。 |
| ReferenceMatcherPort | 类 | 143–149 | 简单 | rust、P、o、r | 0 | 匹配器端口：声明候选匹配算法实现，application 只消费结构化 outcome。 |
| ReferenceMatchingApplication | 类 | 252–259 | 简单 | rust、A、p、l | 0 | 身份匹配应用层 owner：编排候选生成、置信度评估与人工审阅决策的准入。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |
| [reference_application.rs](reference_application.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs | Reference 应用层最大模块：编排文献身份匹配、刷新、canonical artifact 落地与跨域投影，是文献写入路径的编排中枢。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ReferenceMatcherOutcome | 类 | 121–141 | 匹配结果：给出每个候选的置信度、匹配种类与处置建议。 |
| ReferenceMatcherPort | 类 | 143–149 | 匹配器端口：声明候选匹配算法实现，application 只消费结构化 outcome。 |
| ReferenceMatchingApplication | 类 | 252–259 | 身份匹配应用层 owner：编排候选生成、置信度评估与人工审阅决策的准入。 |
