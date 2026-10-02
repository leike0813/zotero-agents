
# response
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:response -->

序列化并写出 HTTP 响应，附加 content-length 与连接关闭语义。
类型：函数  
复杂度：简单  
入边数：2  
标签：http、rust、runtime  
所属文件：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:283](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs#L283)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [bounded_response](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:220–234 | 在响应体积上限内序列化结果，超限时降级为错误响应。 |
| [handle_connection](../runtime_capabilities.rs/handle_connection.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:236–604 | 单连接请求处理中枢：读取 HTTP 请求、解析 call envelope、按 capability 路由到对应 surface 或 owner，并按界限返回响应。 |

## 调用

该符号没有记录对外调用。
