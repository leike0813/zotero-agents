
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs -->

loopback 监听与连接循环：执行连接准入上限管理、handler 注册与回收、共享 deadline 内 drain，并在 socket 中断时及时收敛。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs)

## 符号（8）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:accept_if_capacity -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:ActiveConnections -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:admit -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:bind -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:drain_handlers_until -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:poll -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:reap_finished_handlers -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:SidecarTransport -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| accept_if_capacity | 函数 | 151–164 | 简单 | server-loop、rust、runtime | 0 | 在容量允许时接受一个 loopback 连接，否则立即返回并让出。 |
| ActiveConnections | 类 | 22–24 | 简单 | server-loop、rust、type、lifecycle | 0 | 活跃连接登记表，按上限控制准入并支持对单个 socket 的定向 shutdown。 |
| admit | 函数 | 39–60 | 简单 | server-loop、rust、runtime | 0 | 为新连接分配连接 id 与 lease；超过 MAX_ACTIVE_HTTP_CONNECTIONS 时拒绝以保护进程。 |
| bind | 函数 | 129–140 | 简单 | server-loop、rust、runtime | 0 | 绑定 loopback 监听端口并返回传输所有者。 |
| drain_handlers_until | 函数 | 101–113 | 简单 | server-loop、rust、lifecycle | 0 | 在共享 deadline 内等待所有 handler 结束，并报告仍未退出的连接。 |
| poll | 函数 | 166–203 | 简单 | server-loop、rust、lifecycle | 0 | 单次轮询：接收新连接、回收已结束 handler，并在达到 deadline 时返回 drain 结果。 |
| reap_finished_handlers | 函数 | 87–99 | 简单 | server-loop、rust、runtime | 0 | 回收已结束的 handler 线程句柄，统计 panic 数。 |
| SidecarTransport | 类 | 121–126 | 简单 | server-loop、rust、type、lifecycle | 0 | loopback 传输所有者：持有 TcpListener、活跃连接表与 handler 线程，串起 accept、请求处理与有界 drain。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |
| [runtime_http.rs](runtime_http.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs | 最小 HTTP/1.1 读写实现：带界限的请求行、头部与请求体解析，以及响应写出，专供 loopback 传输使用。 |
| [runtime_lifecycle.rs](runtime_lifecycle.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs | 生命周期与所有权：StopSignal 合并停止原因并让首个 failure 成为 primary，RuntimeOwnership 以独占锁与原子写管理 discovery、runtime root 与 data root。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| bind | 函数 | 129–140 | 绑定 loopback 监听端口并返回传输所有者。 |
| poll | 函数 | 166–203 | 单次轮询：接收新连接、回收已结束 handler，并在达到 deadline 时返回 drain 结果。 |
| SidecarTransport | 类 | 121–126 | loopback 传输所有者：持有 TcpListener、活跃连接表与 handler 线程，串起 accept、请求处理与有界 drain。 |
