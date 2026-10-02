
# rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs -->

Reference 应用层最大模块：编排文献身份匹配、刷新、canonical artifact 落地与跨域投影，是文献写入路径的编排中枢。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs)

## 符号（7）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs:apply_literature_digest -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs:execute_revision_review -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs:LiteratureDigestApplyRequest -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs:ReferenceApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs:RefreshBatchAttempt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs:run_refresh -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs:run_refresh_batch_once -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apply_literature_digest | 函数 | 568–749 | 复杂 | rust、digest、canonical、reference | 0 | 应用文献 Digest 到 canonical 记录，提交后保持派生视图与源事实一致。 |
| execute_revision_review | 函数 | 2300–2415 | 中等 | rust、审阅、canonical、reference | 0 | 执行 canonical revision 审阅决策，已审批的 identity 变化按 stale/conflict 处理。 |
| LiteratureDigestApplyRequest | 类 | 200–231 | 中等 | rust | 0 | 文献 Digest 应用请求：描述 digest 生成范围与目标条目。 |
| ReferenceApplication | 类 | 351–359 | 简单 | rust、A、p、l | 0 | Reference 应用层编排中枢：串接身份匹配、刷新、canonical artifact 落地与跨域投影。 |
| RefreshBatchAttempt | 类 | 160–179 | 简单 | rust | 0 | 刷新批次尝试：记录一次批量刷新尝试的目标集、结果与失败原因，支撑续跑与诊断。 |
| run_refresh | 函数 | 1276–1469 | 复杂 | rust、refresh、编排、reference | 0 | 文献刷新主流程：编排匹配、准备与提交阶段，失败时保留可续跑状态而不重复宿主副作用。 |
| run_refresh_batch_once | 函数 | 1507–1735 | 复杂 | rust、refresh、批量、reference | 0 | 执行一轮刷新批次尝试，记录目标集结果与失败原因以支撑续跑与诊断。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonical_literature_artifacts.rs](canonical_literature_artifacts.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs | 维护文献侧 canonical artifact（规范化附件、Digest、引用分析产物）的领域模型与投影规则，保证同一文献在多处消费时看到一致事实。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |
| [reference_matching.rs](reference_matching.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs | 文献身份匹配：基于标题、作者、年份与标识符计算候选并给出置信度评分，为 canonical 身份收敛提供决策依据。 |
| [reference_refresh.rs](reference_refresh.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs | 文献刷新流程：从 canonical artifact 与 Host facts 重建文献派生视图与健康状态，保证刷新幂等且不重复产生宿主副作用。 |
| [reference.rs](reference.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs | Reference 领域模型：定义文献条目的规范身份、字段语义与派生视图，充当匹配、刷新与展示的公共结构来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| LiteratureDigestApplyRequest | 类 | 200–231 | 文献 Digest 应用请求：描述 digest 生成范围与目标条目。 |
| ReferenceApplication | 类 | 351–359 | Reference 应用层编排中枢：串接身份匹配、刷新、canonical artifact 落地与跨域投影。 |
| RefreshBatchAttempt | 类 | 160–179 | 刷新批次尝试：记录一次批量刷新尝试的目标集、结果与失败原因，支撑续跑与诊断。 |
