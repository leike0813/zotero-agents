
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs -->

诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs)

## 符号（6）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs:current_child_context -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs:emit -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs:NativeDiagnosticEvent -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs:new -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs:ObservationContextGuard -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs:with_observation_context -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| current_child_context | 函数 | 52–72 | 简单 | diagnostics、rust、runtime | 0 | 派生当前线程的子 trace context，继承根上下文的 trace/span 标识。 |
| emit | 函数 | 371–386 | 简单 | diagnostics、rust、runtime | 0 | 发射一条诊断事件；未安装观察上下文时按配置决定输出或丢弃。 |
| NativeDiagnosticEvent | 类 | 133–153 | 简单 | diagnostics、rust、type、lifecycle | 0 | 原生诊断事件：逐字段构造启动、debug 与 lifecycle 事件，支持 trace 锚点与 active pin 解除。 |
| new | 函数 | 156–195 | 简单 | diagnostics、rust、runtime | 0 | 构造该类型的实例，完成必要字段初始化。 |
| ObservationContextGuard | 类 | 110–112 | 简单 | diagnostics、rust、type、lifecycle | 0 | 观察上下文守卫：进入时安装上下文，离开时恢复先前值。 |
| [with_observation_context](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs/with_observation_context.md) | 函数 | 92–102 | 简单 | diagnostics、rust、runtime | 5 | 在指定观察上下文下执行闭包并在退出时还原。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_contract.rs](runtime_contract.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs | 跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_canonical_autosync.rs](runtime_canonical_autosync.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs | canonical 自动同步协调器：观察 canonical 提交后去抖触发 WebDAV 同步，并以 maintenance guard 与 canonical_commit 串行化写入。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_contract.rs](runtime_contract.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs | 跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_public_maintenance_operation.rs](runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |
| [runtime_reverse_host.rs](runtime_reverse_host.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs | 反向 Host 调用客户端：向插件侧 /synthesis/v1/host-call 发起请求，实施响应头与响应体限界，并保证 trace 上下文跨进程传播。 |
| [runtime_server_loop.rs](runtime_server_loop.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs | loopback 监听与连接循环：执行连接准入上限管理、handler 注册与回收、共享 deadline 内 drain，并在 socket 中断时及时收敛。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |
| [runtime_transfer.rs](runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs | 分页传输所有者：管理输入/输出页预算、会话 TTL 与页校验，承载 citation graph build 与 content 两类传输的原子发布与清理。 |
| [runtime_worker_pool.rs](runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs | 计算 worker 池：负责子进程 spawn 与就绪握手、direct 与 paged 两条执行路径、admission 预留与故障隔离，并校验直接执行结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| emit | 函数 | 371–386 | 发射一条诊断事件；未安装观察上下文时按配置决定输出或丢弃。 |
| NativeDiagnosticEvent | 类 | 133–153 | 原生诊断事件：逐字段构造启动、debug 与 lifecycle 事件，支持 trace 锚点与 active pin 解除。 |
| new | 函数 | 156–195 | 构造该类型的实例，完成必要字段初始化。 |
| ObservationContextGuard | 类 | 110–112 | 观察上下文守卫：进入时安装上下文，离开时恢复先前值。 |
| [with_observation_context](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs/with_observation_context.md) | 函数 | 92–102 | 在指定观察上下文下执行闭包并在退出时还原。 |
