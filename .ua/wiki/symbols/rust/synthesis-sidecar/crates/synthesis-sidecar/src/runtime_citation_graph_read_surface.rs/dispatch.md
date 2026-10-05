
# dispatch
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:dispatch -->

Citation Graph 读命令分发：路由 window、neighborhood、metrics、layout 与 workbench 投影。
类型：函数  
复杂度：简单  
入边数：3  
标签：citation-graph、rust、routing  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:1426](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs#L1426)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runtime_citation_graph_commands.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:— | Citation Graph 写命令面：实现 update/retry/layout/metrics/rebuild 的 admission、durable facts 采集，以及每次 dispatch 都新建的私有 rebuild attempt 派发。 |
| [control](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:941–967 | cancel/retry/continue 的对外控制入口，按当前状态选择对应语义。 |
| [submit_with_checkpoint](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:263–324 | 带测试检查点的提交路径：admission 之后可在 dispatch 前精确阻塞以验证中间态。 |

## 调用

该符号没有记录对外调用。
