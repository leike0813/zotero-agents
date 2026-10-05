
# rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs -->

调试用维护操作的应用层实现：面向 Harness 的只读探测与受限修复入口，复用统一 admission 判定并保证不越过生产事实源。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs)

## 符号（2）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs:DebugMaintenanceApplication -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs:DebugSnapshot -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| DebugMaintenanceApplication | 类 | 146–152 | 简单 | rust、A、p、l | 0 | 调试维护应用层：为 Harness 提供只读快照、profiler 与受限维护入口，并复用统一 admission。 |
| DebugSnapshot | 类 | 77–91 | 简单 | rust、S、n、a | 0 | 调试快照：汇总 cache、operation、topic inspection 等运行态观测项，供只读 Harness 页面展示。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [admission.rs](admission.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs | 定义应用层的准入（admission）通用类型：写入操作的 admission scope、去重键与重放基础判定，是所有领域应用共享的入口事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [ports.rs](ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| DebugMaintenanceApplication | 类 | 146–152 | 调试维护应用层：为 Harness 提供只读快照、profiler 与受限维护入口，并复用统一 admission。 |
| DebugSnapshot | 类 | 77–91 | 调试快照：汇总 cache、operation、topic inspection 等运行态观测项，供只读 Harness 页面展示。 |
