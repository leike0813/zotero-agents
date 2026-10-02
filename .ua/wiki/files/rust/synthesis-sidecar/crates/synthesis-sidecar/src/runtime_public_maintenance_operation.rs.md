
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs -->

public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs)

## 符号（24）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:begin_public_maintenance_operation -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:canonicalize_maintenance_receipt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:checkpoint_before_promotion_in_repository -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:classify_failure_code -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:classify_public_maintenance_terminal -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:control -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:control_in_repository -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:control_outcome -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:dispatch -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:emit_public_maintenance_event -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:finish_observed -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:finish_public_maintenance_operation -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:is_public_maintenance_receipt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:maintenance_operation_view -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:MaintenanceExecutionContextGuard -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:MaintenanceOperationView -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:mark_public_maintenance_running -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:read -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:receipt_diagnostic_code -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:receipt_from_record -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:reconcile_restart -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:retry_allowed -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:submit -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs:submit_with_checkpoint -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| begin_public_maintenance_operation | 函数 | 471–536 | 中等 | maintenance、rust、runtime | 0 | 在 repository 内创建初始 operation 记录，只有 insert winner 才能发布 maintenance-started。 |
| canonicalize_maintenance_receipt | 函数 | 157–173 | 简单 | maintenance、rust、runtime | 0 | 判定 canonicalize maintenance receipt 条件是否成立。 |
| checkpoint_before_promotion_in_repository | 函数 | 772–861 | 中等 | maintenance、rust、runtime | 0 | 在 repository 内 promotion 之前插入测试检查点，确定性地暴露未 promotion 的中间态。 |
| classify_failure_code | 函数 | 608–618 | 简单 | maintenance、rust、runtime | 0 | public maintenance 生命周期中的 classify failure code 步骤实现。 |
| classify_public_maintenance_terminal | 函数 | 620–654 | 简单 | maintenance、rust、runtime | 0 | 把工作结果分类为 typed terminal：success、failure、cancel、timeout、spawn failure 或 restart 分类。 |
| control | 函数 | 941–967 | 简单 | maintenance、rust、runtime | 0 | cancel/retry/continue 的对外控制入口，按当前状态选择对应语义。 |
| control_in_repository | 函数 | 969–1095 | 中等 | maintenance、rust、runtime | 0 | 在 repository 内完成控制操作的 compare-and-set；running cancel 只能形成 cancel_requested。 |
| control_outcome | 函数 | 925–939 | 简单 | maintenance、rust、runtime | 0 | public maintenance 生命周期中的 control outcome 步骤实现。 |
| dispatch | 函数 | 326–415 | 中等 | maintenance、rust、routing | 0 | 派发已 admitted 的 maintenance 工作；非 winner 只返回已存 view，不重复 Host effect。 |
| emit_public_maintenance_event | 函数 | 453–469 | 简单 | maintenance、rust、runtime | 0 | 记录 emit public maintenance event，用于诊断、观测或状态留痕。 |
| finish_observed | 函数 | 417–447 | 简单 | maintenance、rust、runtime | 0 | 推进 finish observed 状态转换，并保证失败路径不留下半完成状态。 |
| finish_public_maintenance_operation | 函数 | 656–755 | 中等 | maintenance、rust、runtime | 0 | 以 terminal compare-and-set winner 发布 maintenance-terminal，并解除 originating trace 的 active pin。 |
| is_public_maintenance_receipt | 函数 | 134–155 | 简单 | maintenance、rust、runtime | 0 | 判定 is public maintenance receipt 条件是否成立。 |
| maintenance_operation_view | 函数 | 201–236 | 简单 | maintenance、rust、runtime | 0 | public maintenance 生命周期中的 maintenance operation view 步骤实现。 |
| MaintenanceExecutionContextGuard | 类 | 30–32 | 简单 | maintenance、rust、type、lifecycle | 0 | 执行上下文守卫：把 operation id 绑定到当前线程上下文并在退出时还原。 |
| MaintenanceOperationView | 类 | 92–112 | 简单 | maintenance、rust、type、lifecycle | 0 | 对外的 typed operation 视图，只暴露状态、receipt 与视图字段，不暴露持久化记录。 |
| mark_public_maintenance_running | 函数 | 538–576 | 简单 | maintenance、rust、runtime | 0 | 以 compare-and-set 把已存 operation 推进到 running 终态前的运行标记。 |
| [read](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs/read.md) | 函数 | 238–247 | 简单 | maintenance、rust、read-path | 2 | 按 operation id 读取 typed operation view 或 receipt。 |
| receipt_diagnostic_code | 函数 | 586–606 | 简单 | maintenance、rust、runtime | 0 | public maintenance 生命周期中的 receipt diagnostic code 步骤实现。 |
| receipt_from_record | 函数 | 175–199 | 简单 | maintenance、rust、runtime | 0 | public maintenance 生命周期中的 receipt from record 步骤实现。 |
| [reconcile_restart](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs/reconcile_restart.md) | 函数 | 1100–1209 | 中等 | maintenance、rust、runtime | 2 | 启动期对账：不自动 replay，public pending 转为 continuation_required，public running 以 restart_external_effect_unknown 失败。 |
| retry_allowed | 函数 | 863–885 | 简单 | maintenance、rust、runtime | 0 | 执行 retry allowed 流程，并在失败时回滚已取得的资源。 |
| submit | 函数 | 249–261 | 简单 | maintenance、rust、runtime | 0 | public maintenance 提交入口：durable insert winner 才取得 execution owner 并派发 worker。 |
| submit_with_checkpoint | 函数 | 263–324 | 中等 | maintenance、rust、runtime | 0 | 带测试检查点的提交路径：admission 之后可在 dispatch 前精确阻塞以验证中间态。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_background_tasks.rs](runtime_background_tasks.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs | 后台任务所有者：注册后台线程、停止准入、协作式取消，并在共享 deadline 内 drain，回报残留任务数与 panic 计数。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_test_checkpoint.rs](runtime_test_checkpoint.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs | 进程级测试检查点：以 armed/held/release 文件协议让集成测试在 sidecar 的特定时序点精确阻塞，用于确定性验证中间态。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_citation_graph_commands.rs](runtime_citation_graph_commands.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs | Citation Graph 写命令面：实现 update/retry/layout/metrics/rebuild 的 admission、durable facts 采集，以及每次 dispatch 都新建的私有 rebuild attempt 派发。 |
| [runtime_concept_topic_graph_surface.rs](runtime_concept_topic_graph_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs | Concept KB 与 Topic Graph 的唯一公共适配面：持有公共别名、captured CAS basis，以及由 production client runtime 选定的领域类型化命令。 |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_reference_citation_surface.rs](runtime_reference_citation_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs | Reference/Citation 公共面：处理引用审阅单条与批量决策、related items 回显消费，并把命令失败投影为统一的 wire 结果。 |
| [runtime_tag_surface.rs](runtime_tag_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs | Tag 公共面的唯一生产适配器：路由标签导入预览与应用、审阅替换与追加，并保持私有 vocabulary application 作为持久领域 owner。 |
| [runtime_topic_workbench_surface.rs](runtime_topic_workbench_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs | Topic Workbench 投影面：把 topic、concept、topic graph 的领域记录投影为有界 wire DTO，清洗审阅工件，并组装 workflow review 输入。 |
| [runtime_webdav_maintenance_surface.rs](runtime_webdav_maintenance_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs | WebDAV 与 maintenance 的公共适配面：只承担 wire 校验与编码，从生产 catalog 取已解析的不透明 maintenance route，并暴露启动对账等运维动作。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| control | 函数 | 941–967 | cancel/retry/continue 的对外控制入口，按当前状态选择对应语义。 |
| MaintenanceOperationView | 类 | 92–112 | 对外的 typed operation 视图，只暴露状态、receipt 与视图字段，不暴露持久化记录。 |
| [read](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs/read.md) | 函数 | 238–247 | 按 operation id 读取 typed operation view 或 receipt。 |
| [reconcile_restart](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs/reconcile_restart.md) | 函数 | 1100–1209 | 启动期对账：不自动 replay，public pending 转为 continuation_required，public running 以 restart_external_effect_unknown 失败。 |
| submit | 函数 | 249–261 | public maintenance 提交入口：durable insert winner 才取得 execution owner 并派发 worker。 |
