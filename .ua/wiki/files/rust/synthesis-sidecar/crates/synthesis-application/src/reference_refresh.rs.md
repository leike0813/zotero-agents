
# rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs -->

文献刷新流程：从 canonical artifact 与 Host facts 重建文献派生视图与健康状态，保证刷新幂等且不重复产生宿主副作用。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs)

## 符号（7）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs:apply_refresh_with_commit -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs:Preparation -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs:prepare_refresh_with_options -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs:project_complete -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs:ReferenceRefreshApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs:ReferenceRefreshRun -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs:validate_prepare -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apply_refresh_with_commit | 函数 | 613–732 | 中等 | rust、提交、事务、refresh | 0 | 提交刷新结果：写入前重新校验 prepared 事实，digest 变化时要求重新审批。 |
| Preparation | 类 | 174–184 | 简单 | rust | 0 | 刷新准备结果：记录已就绪的 artifact 描述与可应用范围，apply 阶段必须重新校验。 |
| prepare_refresh_with_options | 函数 | 355–577 | 复杂 | rust、prepare、refresh、reference | 0 | 按选项准备刷新：计算受影响范围与可应用 artifact，仅在无副作用状态完成。 |
| project_complete | 函数 | 852–1316 | 复杂 | rust、投影、refresh、状态 | 0 | 投影刷新完成态：汇总产物就绪情况与遗留失败项。 |
| ReferenceRefreshApplication | 类 | 199–205 | 简单 | rust、A、p、l | 0 | 文献刷新应用层 owner：管理刷新 run、prepare/apply 两阶段与容量控制，保证幂等与无重复宿主副作用。 |
| ReferenceRefreshRun | 类 | 209–211 | 简单 | rust | 0 | 刷新 run 记录：跟踪单次刷新运行的状态、进度与派生产物。 |
| validate_prepare | 函数 | 1563–1640 | 中等 | rust、校验、prepare、一致性 | 0 | 校验 prepare 结果与当前 basis 是否一致，不一致时拒绝进入 apply。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [canonical_literature_artifacts.rs](canonical_literature_artifacts.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs | 维护文献侧 canonical artifact（规范化附件、Digest、引用分析产物）的领域模型与投影规则，保证同一文献在多处消费时看到一致事实。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [reference_application.rs](reference_application.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs | Reference 应用层最大模块：编排文献身份匹配、刷新、canonical artifact 落地与跨域投影，是文献写入路径的编排中枢。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| Preparation | 类 | 174–184 | 刷新准备结果：记录已就绪的 artifact 描述与可应用范围，apply 阶段必须重新校验。 |
| ReferenceRefreshApplication | 类 | 199–205 | 文献刷新应用层 owner：管理刷新 run、prepare/apply 两阶段与容量控制，保证幂等与无重复宿主副作用。 |
| ReferenceRefreshRun | 类 | 209–211 | 刷新 run 记录：跟踪单次刷新运行的状态、进度与派生产物。 |
