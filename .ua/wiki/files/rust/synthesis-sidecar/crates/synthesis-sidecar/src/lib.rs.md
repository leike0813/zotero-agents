
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs -->

Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_artifact_library_debug.rs](runtime_artifact_library_debug.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs | Artifact Library 调试与导出面：扫描 artifact 描述符、分页读取内容、构建导出计划，并把导出结果组装为 Markdown 或宿主可写文本。 |
| [runtime_background_tasks.rs](runtime_background_tasks.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs | 后台任务所有者：注册后台线程、停止准入、协作式取消，并在共享 deadline 内 drain，回报残留任务数与 panic 计数。 |
| [runtime_canonical_autosync.rs](runtime_canonical_autosync.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs | canonical 自动同步协调器：观察 canonical 提交后去抖触发 WebDAV 同步，并以 maintenance guard 与 canonical_commit 串行化写入。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_citation_graph_commands.rs](runtime_citation_graph_commands.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs | Citation Graph 写命令面：实现 update/retry/layout/metrics/rebuild 的 admission、durable facts 采集，以及每次 dispatch 都新建的私有 rebuild attempt 派发。 |
| [runtime_citation_graph_read_surface.rs](runtime_citation_graph_read_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs | Citation Graph 读面：按 graph/input/metrics basis 校验后读取窗口、邻域、指标与布局，在响应预算内完成有界切片与分页投影。 |
| [runtime_concept_topic_graph_surface.rs](runtime_concept_topic_graph_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs | Concept KB 与 Topic Graph 的唯一公共适配面：持有公共别名、captured CAS basis，以及由 production client runtime 选定的领域类型化命令。 |
| [runtime_contract.rs](runtime_contract.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs | 跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。 |
| [runtime_deadline.rs](runtime_deadline.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs | 请求级 deadline：以 thread-local 记录请求截止时间，把下游 timeout 收敛为有界剩余时间，并在操作结束后恢复先前值。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |
| [runtime_file_system.rs](runtime_file_system.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_file_system.rs | 文件系统平台适配：提供目录 fsync 以保证重命名前后的持久性边界，Windows 走 no-op 变体。 |
| [runtime_host_collection.rs](runtime_host_collection.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs | Zotero Host 条目采集：实现 TopicLibraryQueryPort 的分页与按 ref 批量读取适配，把宿主条目转换为领域 TopicLibraryItem。 |
| [runtime_http.rs](runtime_http.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs | 最小 HTTP/1.1 读写实现：带界限的请求行、头部与请求体解析，以及响应写出，专供 loopback 传输使用。 |
| [runtime_lifecycle.rs](runtime_lifecycle.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs | 生命周期与所有权：StopSignal 合并停止原因并让首个 failure 成为 primary，RuntimeOwnership 以独占锁与原子写管理 discovery、runtime root 与 data root。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_public_maintenance_operation.rs](runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |
| [runtime_reference_citation_surface.rs](runtime_reference_citation_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs | Reference/Citation 公共面：处理引用审阅单条与批量决策、related items 回显消费，并把命令失败投影为统一的 wire 结果。 |
| [runtime_reverse_host.rs](runtime_reverse_host.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs | 反向 Host 调用客户端：向插件侧 /synthesis/v1/host-call 发起请求，实施响应头与响应体限界，并保证 trace 上下文跨进程传播。 |
| [runtime_server_loop.rs](runtime_server_loop.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs | loopback 监听与连接循环：执行连接准入上限管理、handler 注册与回收、共享 deadline 内 drain，并在 socket 中断时及时收敛。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |
| [runtime_tag_surface.rs](runtime_tag_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs | Tag 公共面的唯一生产适配器：路由标签导入预览与应用、审阅替换与追加，并保持私有 vocabulary application 作为持久领域 owner。 |
| [runtime_test_checkpoint.rs](runtime_test_checkpoint.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs | 进程级测试检查点：以 armed/held/release 文件协议让集成测试在 sidecar 的特定时序点精确阻塞，用于确定性验证中间态。 |
| [runtime_topic_workbench_surface.rs](runtime_topic_workbench_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs | Topic Workbench 投影面：把 topic、concept、topic graph 的领域记录投影为有界 wire DTO，清洗审阅工件，并组装 workflow review 输入。 |
| [runtime_transfer.rs](runtime_transfer.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs | 分页传输所有者：管理输入/输出页预算、会话 TTL 与页校验，承载 citation graph build 与 content 两类传输的原子发布与清理。 |
| [runtime_webdav_maintenance_surface.rs](runtime_webdav_maintenance_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs | WebDAV 与 maintenance 的公共适配面：只承担 wire 校验与编码，从生产 catalog 取已解析的不透明 maintenance route，并暴露启动对账等运维动作。 |
| [runtime_webdav_runtime.rs](runtime_webdav_runtime.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs | WebDAV 运行时适配：以文件状态存储保存同步状态（原子写入），并提供可被停止信号中断的重试调度器。 |
| [runtime_worker_pool.rs](runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs | 计算 worker 池：负责子进程 spawn 与就绪握手、direct 与 paged 两条执行路径、admission 预留与故障隔离，并校验直接执行结果。 |
| [runtime_worker.rs](runtime_worker.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs | worker CLI 适配：按 stdin/stdout 帧协议读取任务、装配分页输入，并把分页结果按 graph 与 concept 两种形态写出。 |
