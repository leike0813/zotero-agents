
# handle_connection
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:handle_connection -->

单连接请求处理中枢：读取 HTTP 请求、解析 call envelope、按 capability 路由到对应 surface 或 owner，并按界限返回响应。
类型：函数  
复杂度：复杂  
入边数：1  
标签：capability-dispatch、rust、routing  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:236](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs#L236)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [poll](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:166–203 | 单次轮询：接收新连接、回收已结束 handler，并在达到 deadline 时返回 drain 结果。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [with_observation_context](../runtime_diagnostics.rs/with_observation_context.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs:92–102 | 在指定观察上下文下执行闭包并在退出时还原。 |
| [response](../runtime_http.rs/response.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:283–306 | 序列化并写出 HTTP 响应，附加 content-length 与连接关闭语义。 |
| [production_client_error_status](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:1083–1106 | 把内部 client 错误码映射为对外 HTTP 状态。 |
| [dispatch_transfer_action](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs:354–395 | 传输动作分发：按 action 选择 begin/put/seal/execute/get/cleanup 路径并施加预算约束。 |
