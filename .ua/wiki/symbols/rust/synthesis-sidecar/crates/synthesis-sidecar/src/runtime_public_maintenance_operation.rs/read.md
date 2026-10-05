
# read
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:read -->

按 operation id 读取 typed operation view 或 receipt。
类型：函数  
复杂度：简单  
入边数：2  
标签：maintenance、rust、read-path  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:238](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs#L238)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runtime_transfer.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:— | 分页传输所有者：管理输入/输出页预算、会话 TTL 与页校验，承载 citation graph build 与 content 两类传输的原子发布与清理。 |
| [runtime_webdav_runtime.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs:— | WebDAV 运行时适配：以文件状态存储保存同步状态（原子写入），并提供可被停止信号中断的重试调度器。 |

## 调用

该符号没有记录对外调用。
