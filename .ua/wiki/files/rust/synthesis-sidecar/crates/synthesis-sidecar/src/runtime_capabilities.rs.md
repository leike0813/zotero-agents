
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs -->

capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs)

## 符号（6）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:bounded_response -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:error_response -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:handle_connection -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:json_within_bounds_for_capability -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:json_within_bounds_with_string_limit -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs:new -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| bounded_response | 函数 | 220–234 | 简单 | capability-dispatch、rust、validation | 0 | 在响应体积上限内序列化结果，超限时降级为错误响应。 |
| error_response | 函数 | 160–188 | 简单 | capability-dispatch、rust、runtime | 0 | 构造统一的 capability 错误响应，把内部错误码映射为对外状态与诊断细节。 |
| [handle_connection](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs/handle_connection.md) | 函数 | 236–604 | 复杂 | capability-dispatch、rust、routing | 1 | 单连接请求处理中枢：读取 HTTP 请求、解析 call envelope、按 capability 路由到对应 surface 或 owner，并按界限返回响应。 |
| json_within_bounds_for_capability | 函数 | 89–106 | 简单 | capability-dispatch、rust、runtime | 0 | 按 capability 选择 JSON 节点上限后校验输入复杂度，阻断超大请求体。 |
| json_within_bounds_with_string_limit | 函数 | 108–142 | 简单 | capability-dispatch、rust、runtime | 0 | 在 JSON 节点上限之外附加单字符串长度上限，用于限制异常大文本字段。 |
| new | 函数 | 54–78 | 简单 | capability-dispatch、rust、runtime | 0 | 构造该类型的实例，完成必要字段初始化。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_background_tasks.rs](runtime_background_tasks.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs | 后台任务所有者：注册后台线程、停止准入、协作式取消，并在共享 deadline 内 drain，回报残留任务数与 panic 计数。 |
| [runtime_contract.rs](runtime_contract.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs | 跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |
| [runtime_http.rs](runtime_http.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs | 最小 HTTP/1.1 读写实现：带界限的请求行、头部与请求体解析，以及响应写出，专供 loopback 传输使用。 |
| [runtime_lifecycle.rs](runtime_lifecycle.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs | 生命周期与所有权：StopSignal 合并停止原因并让首个 failure 成为 primary，RuntimeOwnership 以独占锁与原子写管理 discovery、runtime root 与 data root。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_transfer.rs](runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs | 分页传输所有者：管理输入/输出页预算、会话 TTL 与页校验，承载 citation graph build 与 content 两类传输的原子发布与清理。 |
| [runtime_worker_pool.rs](runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs | 计算 worker 池：负责子进程 spawn 与就绪握手、direct 与 paged 两条执行路径、admission 预留与故障隔离，并校验直接执行结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_server_loop.rs](runtime_server_loop.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs | loopback 监听与连接循环：执行连接准入上限管理、handler 注册与回收、共享 deadline 内 drain，并在 socket 中断时及时收敛。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| error_response | 函数 | 160–188 | 构造统一的 capability 错误响应，把内部错误码映射为对外状态与诊断细节。 |
| [handle_connection](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs/handle_connection.md) | 函数 | 236–604 | 单连接请求处理中枢：读取 HTTP 请求、解析 call envelope、按 capability 路由到对应 surface 或 owner，并按界限返回响应。 |
| new | 函数 | 54–78 | 构造该类型的实例，完成必要字段初始化。 |
