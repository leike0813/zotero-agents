
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs -->

最小 HTTP/1.1 读写实现：带界限的请求行、头部与请求体解析，以及响应写出，专供 loopback 传输使用。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs)

## 符号（7）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:HttpReadError -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:parse_header -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:read_body -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:read_header -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:read_http_with_policy -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:response -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs:timeout_for_read -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| HttpReadError | 类 | 43–49 | 简单 | http、rust、type、lifecycle | 0 | HTTP 读取错误：区分超时、格式错误与超限，便于映射为对外状态。 |
| parse_header | 函数 | 162–221 | 中等 | http、rust、runtime | 0 | 解析头部行与空行分隔，校验必需字段并返回头部集合。 |
| read_body | 函数 | 223–256 | 简单 | http、rust、read-path | 0 | 按 content-length 读取请求体，超出上限时拒绝。 |
| read_header | 函数 | 106–153 | 简单 | http、rust、read-path | 0 | 逐行读取 HTTP 头部，累积字节并在超限时中止。 |
| read_http_with_policy | 函数 | 258–277 | 简单 | http、rust、read-path | 0 | 按给定读策略读取完整 HTTP 请求：请求行、头部与请求体，界限与超时均来自策略。 |
| [response](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs/response.md) | 函数 | 283–306 | 简单 | http、rust、runtime | 2 | 序列化并写出 HTTP 响应，附加 content-length 与连接关闭语义。 |
| timeout_for_read | 函数 | 92–104 | 简单 | http、rust、runtime | 0 | HTTP/1.1 读写中的 timeout for read 步骤实现。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_server_loop.rs](runtime_server_loop.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs | loopback 监听与连接循环：执行连接准入上限管理、handler 注册与回收、共享 deadline 内 drain，并在 socket 中断时及时收敛。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| HttpReadError | 类 | 43–49 | HTTP 读取错误：区分超时、格式错误与超限，便于映射为对外状态。 |
| [response](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs/response.md) | 函数 | 283–306 | 序列化并写出 HTTP 响应，附加 content-length 与连接关闭语义。 |
