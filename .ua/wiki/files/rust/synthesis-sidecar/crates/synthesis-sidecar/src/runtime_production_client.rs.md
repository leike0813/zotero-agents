
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs -->

生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs)

## 符号（22）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:dispatch_artifact_export -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:dispatch_production_client -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:dispatch_public_maintenance_control -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:dispatch_typed_client -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:emit_query_observation -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:execute -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:fmt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:from_sources -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:new -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:production_client_error_status -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:production_client_operation_manifest -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:production_client_operation_metadata -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:production_client_route_entries -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:ProductionClientCatalog -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:ProductionClientRouteEntry -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:ProductionClientRuntime -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:record_semantic_mutation_result -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:resolve_maintenance -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:resolved_policy -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:ResolvedMaintenanceRoute -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:valid_execution_plan -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs:valid_policy -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| dispatch_artifact_export | 函数 | 770–856 | 中等 | production-client、rust、routing | 0 | 派发 artifact 导出请求，走独立的导出计划与内容组装路径。 |
| dispatch_production_client | 函数 | 858–1007 | 中等 | production-client、rust、routing | 0 | production client 分发入口：按解析出的 route 选择 typed dispatch、artifact export 或 maintenance control。 |
| dispatch_public_maintenance_control | 函数 | 1009–1030 | 简单 | production-client、rust、routing | 0 | 把 maintenance 控制请求投递给 public maintenance 生命周期 owner。 |
| dispatch_typed_client | 函数 | 758–768 | 简单 | production-client、rust、routing | 0 | 按 operation metadata 派发类型化客户端操作，并记录语义化 mutation 结果。 |
| emit_query_observation | 函数 | 1032–1055 | 简单 | production-client、rust、runtime | 0 | 为查询类操作发射观测事件，不写业务状态。 |
| execute | 函数 | 213–243 | 简单 | production-client、rust、lifecycle | 0 | 按 route 执行一次客户端操作并返回结果与分类。 |
| fmt | 函数 | 276–287 | 简单 | production-client、rust、runtime | 0 | 运行时模块中的 fmt 步骤实现。 |
| from_sources | 函数 | 301–433 | 中等 | production-client、rust、runtime | 0 | 从内嵌的 capability 与 operation manifest 构建目录，并对不一致项产出结构化 issue。 |
| new | 函数 | 494–506 | 简单 | production-client、rust、runtime | 0 | 构造该类型的实例，完成必要字段初始化。 |
| production_client_error_status | 函数 | 1083–1106 | 简单 | production-client、rust、runtime | 1 | 把内部 client 错误码映射为对外 HTTP 状态。 |
| production_client_operation_manifest | 函数 | 623–697 | 中等 | production-client、rust、runtime | 0 | 解析 operation manifest，得到每个操作的元数据与计划。 |
| production_client_operation_metadata | 函数 | 699–730 | 简单 | production-client、rust、runtime | 0 | 投影单个 operation 的元数据：receipt 形态、访问级别与 work model。 |
| production_client_route_entries | 函数 | 571–581 | 简单 | production-client、rust、runtime | 0 | 汇总各 public surface 声明的 route 条目形成统一路由表。 |
| ProductionClientCatalog | 类 | 247–250 | 简单 | production-client、rust、type、lifecycle | 0 | production client 目录：持有解析后的 capability/operation 元数据与 route 集合，提供查询与 maintenance 解析。 |
| ProductionClientRouteEntry | 类 | 52–57 | 简单 | production-client、rust、type、lifecycle | 0 | 单条 route 描述：capability、handler 标识、访问模式、数据面与 work model。 |
| ProductionClientRuntime | 类 | 486–491 | 简单 | production-client、rust、type、lifecycle | 0 | 生产 client 运行时：把目录与 application 组合成可执行的 dispatch 入口。 |
| record_semantic_mutation_result | 函数 | 1057–1081 | 简单 | production-client、rust、runtime | 0 | 记录一次语义化 mutation 的结果类别，供 receipt 与观测使用。 |
| resolve_maintenance | 函数 | 454–466 | 简单 | production-client、rust、runtime | 0 | 执行 resolve maintenance 流程，并在失败时回滚已取得的资源。 |
| resolved_policy | 函数 | 583–599 | 简单 | production-client、rust、runtime | 0 | 把默认 policy 与 override 合并为最终生效策略。 |
| ResolvedMaintenanceRoute | 类 | 192–198 | 简单 | production-client、rust、type、lifecycle | 0 | 已解析的不透明 maintenance route，携带 operation 类别与执行计划。 |
| valid_execution_plan | 函数 | 528–562 | 简单 | production-client、rust、runtime | 0 | 校验 execution plan 与 operation 声明一致，拒绝不完整计划。 |
| valid_policy | 函数 | 601–621 | 简单 | production-client、rust、runtime | 0 | 校验 policy 覆盖全部 operation 且无多余项。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_background_tasks.rs](runtime_background_tasks.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs | 后台任务所有者：注册后台线程、停止准入、协作式取消，并在共享 deadline 内 drain，回报残留任务数与 panic 计数。 |
| [runtime_contract.rs](runtime_contract.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs | 跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。 |
| [runtime_deadline.rs](runtime_deadline.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs | 请求级 deadline：以 thread-local 记录请求截止时间，把下游 timeout 收敛为有界剩余时间，并在操作结束后恢复先前值。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |
| [runtime_public_maintenance_operation.rs](runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |
| [runtime_webdav_maintenance_surface.rs](runtime_webdav_maintenance_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs | WebDAV 与 maintenance 的公共适配面：只承担 wire 校验与编码，从生产 catalog 取已解析的不透明 maintenance route，并暴露启动对账等运维动作。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_artifact_library_debug.rs](runtime_artifact_library_debug.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs | Artifact Library 调试与导出面：扫描 artifact 描述符、分页读取内容、构建导出计划，并把导出结果组装为 Markdown 或宿主可写文本。 |
| [runtime_canonical_autosync.rs](runtime_canonical_autosync.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs | canonical 自动同步协调器：观察 canonical 提交后去抖触发 WebDAV 同步，并以 maintenance guard 与 canonical_commit 串行化写入。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_concept_topic_graph_surface.rs](runtime_concept_topic_graph_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs | Concept KB 与 Topic Graph 的唯一公共适配面：持有公共别名、captured CAS basis，以及由 production client runtime 选定的领域类型化命令。 |
| [runtime_public_maintenance_operation.rs](runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |
| [runtime_reference_citation_surface.rs](runtime_reference_citation_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs | Reference/Citation 公共面：处理引用审阅单条与批量决策、related items 回显消费，并把命令失败投影为统一的 wire 结果。 |
| [runtime_service.rs](runtime_service.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs | 生产生命周期唯一入口 serve：读取配置、装配资源、绑定 listener、原子发布 discovery，并统一负责运行期终止、500 ms 有界清理与 typed terminal result。 |
| [runtime_tag_surface.rs](runtime_tag_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs | Tag 公共面的唯一生产适配器：路由标签导入预览与应用、审阅替换与追加，并保持私有 vocabulary application 作为持久领域 owner。 |
| [runtime_topic_workbench_surface.rs](runtime_topic_workbench_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs | Topic Workbench 投影面：把 topic、concept、topic graph 的领域记录投影为有界 wire DTO，清洗审阅工件，并组装 workflow review 输入。 |
| [runtime_webdav_maintenance_surface.rs](runtime_webdav_maintenance_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs | WebDAV 与 maintenance 的公共适配面：只承担 wire 校验与编码，从生产 catalog 取已解析的不透明 maintenance route，并暴露启动对账等运维动作。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| execute | 函数 | 213–243 | 按 route 执行一次客户端操作并返回结果与分类。 |
| new | 函数 | 494–506 | 构造该类型的实例，完成必要字段初始化。 |
| production_client_error_status | 函数 | 1083–1106 | 把内部 client 错误码映射为对外 HTTP 状态。 |
| ProductionClientCatalog | 类 | 247–250 | production client 目录：持有解析后的 capability/operation 元数据与 route 集合，提供查询与 maintenance 解析。 |
| ProductionClientRouteEntry | 类 | 52–57 | 单条 route 描述：capability、handler 标识、访问模式、数据面与 work model。 |
| ProductionClientRuntime | 类 | 486–491 | 生产 client 运行时：把目录与 application 组合成可执行的 dispatch 入口。 |
| resolve_maintenance | 函数 | 454–466 | 执行 resolve maintenance 流程，并在失败时回滚已取得的资源。 |
| ResolvedMaintenanceRoute | 类 | 192–198 | 已解析的不透明 maintenance route，携带 operation 类别与执行计划。 |
