
# rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs -->

Workbench 跨域投影：把 Citation Graph、Topic 等领域视图组合成工作台所需的读模型，是宿主 observation 的组装点。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs)

## 符号（5）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs:current_failure -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs:read -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs:read_public_chrome -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs:read_surface -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs:WorkbenchApplication -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| current_failure | 函数 | 258–284 | 简单 | rust、诊断、错误处理、workbench | 0 | 解析工作台当前失败原因并映射为可展示的诊断信息。 |
| read | 函数 | 26–97 | 中等 | rust、读模型、workbench、投影 | 0 | 工作台主读入口：组合各领域视图产出统一读模型，避免各面板重复查询。 |
| read_public_chrome | 函数 | 103–174 | 中等 | rust、chrome、投影、workbench | 0 | 读取工作台 chrome 信息（进度、维护态、后台任务），与具体 surface 状态解耦。 |
| read_surface | 函数 | 180–201 | 简单 | rust、surface、读模型、容错 | 0 | 读取单个 surface 的当前状态与错误诊断，失败时保留已加载内容。 |
| WorkbenchApplication | 类 | 17–19 | 简单 | rust、A、p、l | 0 | Workbench 应用层：把 Citation Graph、Topic 等领域视图组合成工作台读模型，并暴露 surface 与 maintenance 入口。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dto.rs](dto.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs | 应用层跨边界 DTO 集合：定义 Workbench、Topic、Citation Graph 等对外投影视图与 wire 结构，作为宿主与 Workbench 的唯一契约来源。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| WorkbenchApplication | 类 | 17–19 | Workbench 应用层：把 Citation Graph、Topic 等领域视图组合成工作台读模型，并暴露 surface 与 maintenance 入口。 |
