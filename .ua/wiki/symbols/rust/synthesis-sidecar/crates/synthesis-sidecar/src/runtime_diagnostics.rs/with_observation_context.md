
# with_observation_context
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs:with_observation_context -->

在指定观察上下文下执行闭包并在退出时还原。
类型：函数  
复杂度：简单  
入边数：5  
标签：diagnostics、rust、runtime  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs:92](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs#L92)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [runtime_reverse_host.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs:— | 反向 Host 调用客户端：向插件侧 /synthesis/v1/host-call 发起请求，实施响应头与响应体限界，并保证 trace 上下文跨进程传播。 |
| [handle_connection](../runtime_capabilities.rs/handle_connection.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:236–604 | 单连接请求处理中枢：读取 HTTP 请求、解析 call envelope、按 capability 路由到对应 surface 或 owner，并按界限返回响应。 |
| [dispatch](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:326–415 | 派发已 admitted 的 maintenance 工作；非 winner 只返回已存 view，不重复 Host effect。 |
| [call_reverse_host_with_transport](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs:161–188 | 带可注入传输的调用版本，便于测试替换网络实现并复用 trace 传播逻辑。 |
| [queue_transfer_execution](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:397–488 | 把已封口的传输请求排入执行队列，并在预算内启动一次执行尝试。 |

## 调用

该符号没有记录对外调用。
