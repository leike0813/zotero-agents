
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs -->

生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs)

## 符号（11）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:discovery_document -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:ensure_production_source -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:initialize_empty_production -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:rollback -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:run -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:RunningRuntime -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:shutdown -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:stable_startup_code -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:start -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:startup_step -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs:StartupOwnership -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| discovery_document | 函数 | 567–591 | 简单 | service-lifecycle、rust、runtime | 0 | 构造 sidecar discovery 文档：绑定 profile、bundle、build fingerprint、target triple、端口与能力清单，是 ready 的对外发布物。 |
| ensure_production_source | 函数 | 98–119 | 简单 | service-lifecycle、rust、runtime | 0 | 校验并确保 production 数据源已就位，缺失时按配置重建。 |
| initialize_empty_production | 函数 | 78–96 | 简单 | service-lifecycle、rust、runtime | 0 | 在空运行根目录下初始化空的 production schema 与 legacy topic 投影。 |
| rollback | 函数 | 137–149 | 简单 | service-lifecycle、rust、runtime | 0 | ready 之前失败时回滚已取得的 owner 锁与临时产物，释放运行根目录独占权。 |
| run | 函数 | 368–426 | 中等 | service-lifecycle、rust、lifecycle | 0 | 运行期主循环：驱动 server loop 轮询直到收到停止信号，随后进入统一清理路径。 |
| RunningRuntime | 类 | 164–175 | 简单 | service-lifecycle、rust、type、lifecycle | 0 | 已进入 ready 状态的运行时句柄，持有各 owner 与停止信号并负责 run/shutdown 配对。 |
| shutdown | 函数 | 428–548 | 中等 | service-lifecycle、rust、lifecycle | 0 | 有界清理：停止准入、停止并 drain 后台任务与 compute/transfer owner，关闭 repository 并移除 discovery，全部失败归为 secondary issue。 |
| stable_startup_code | 函数 | 37–49 | 简单 | service-lifecycle、rust、runtime | 0 | 把启动期内部错误码归一为稳定的对外错误码，避免实现细节外泄。 |
| start | 函数 | 178–366 | 中等 | service-lifecycle、rust、lifecycle | 0 | 读取启动配置、校验并接管运行根目录所有权、装配生产应用与各 owner，然后绑定 listener 并原子发布 discovery。 |
| startup_step | 函数 | 51–69 | 简单 | service-lifecycle、rust、lifecycle | 0 | 执行一个可回滚的启动步骤，并把失败归类到对应 ServePhase。 |
| StartupOwnership | 类 | 122–126 | 简单 | service-lifecycle、rust、type、lifecycle | 0 | 启动期已取得的独占 owner 集合，失败时按相反顺序回滚。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_background_tasks.rs](runtime_background_tasks.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs | 后台任务所有者：注册后台线程、停止准入、协作式取消，并在共享 deadline 内 drain，回报残留任务数与 panic 计数。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_contract.rs](runtime_contract.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs | 跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |
| [runtime_lifecycle.rs](runtime_lifecycle.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs | 生命周期与所有权：StopSignal 合并停止原因并让首个 failure 成为 primary，RuntimeOwnership 以独占锁与原子写管理 discovery、runtime root 与 data root。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_reverse_host.rs](runtime_reverse_host.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs | 反向 Host 调用客户端：向插件侧 /synthesis/v1/host-call 发起请求，实施响应头与响应体限界，并保证 trace 上下文跨进程传播。 |
| [runtime_server_loop.rs](runtime_server_loop.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs | loopback 监听与连接循环：执行连接准入上限管理、handler 注册与回收、共享 deadline 内 drain，并在 socket 中断时及时收敛。 |
| [runtime_transfer.rs](runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs | 分页传输所有者：管理输入/输出页预算、会话 TTL 与页校验，承载 citation graph build 与 content 两类传输的原子发布与清理。 |
| [runtime_worker_pool.rs](runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs | 计算 worker 池：负责子进程 spawn 与就绪握手、direct 与 paged 两条执行路径、admission 预留与故障隔离，并校验直接执行结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
