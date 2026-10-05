
# rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs -->

应用层跨边界 DTO 集合：定义 Workbench、Topic、Citation Graph 等对外投影视图与 wire 结构，作为宿主与 Workbench 的唯一契约来源。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |
| [topic.rs](topic.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs | Topic 领域应用层：管理主题 identity、成员变更、合并与查询，并结合 concept KB 与 topic graph 投影跨域主题视图。 |
| [workbench.rs](workbench.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs | Workbench 跨域投影：把 Citation Graph、Topic 等领域视图组合成工作台所需的读模型，是宿主 observation 的组装点。 |
