
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs -->

生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs)

## 符号（57）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:ReverseHostApplicationPort::apply_batch -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:ReverseHostApplicationPort::apply_batch@2152 -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:apply_section_patch -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:artifact_readiness -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:assemble_artifact -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:binding_outcomes -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:binding_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:bounded_citation_compute_text -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:build -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:NativeConceptKbComputePort::build_index -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:NativeTagVocabularyComputePort::build_index -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:NativeTopicGraphComputePort::build_index -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:build_production_applications -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:canonical_records -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:citation_compute_node -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:citation_node_kind -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:citation_paper_parts -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:consume_related_items_sync_echo -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:dedupe_outcomes -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:dedupe_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:dedupe_title_candidates -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:emit -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:layout -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:list_items_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:matcher_groups -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:matcher_papers -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:merge_evidence_field -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:metrics -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:NativeCitationGraphComputePort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:NativeConceptKbComputePort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:NativeReferenceObservationPort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:NativeStructuredArtifactPort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:NativeTagAuditRuntimePort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:NativeTagVocabularyComputePort -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:observation_scope -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:opaque_id -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:ProductionApplications -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:query -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:ReverseHostApplicationPort::read -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:ReverseHostApplicationPort::read@2061 -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:ReverseHostApplicationPort::read@2075 -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:read_artifact -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:redirect_map -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:reference_matcher_outcomes -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:reference_matcher_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:resolve -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:resolve_matcher_canonical -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:ReverseHostApplicationPort -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:scan_artifacts_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:stored_identifiers -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:tag_worker_abbrevs -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:tag_worker_entries -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:test_checkpoint_root -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:validate -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:validate_artifact -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:validate_manifest -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs:write_text -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apply_batch | 函数 | 2091–2148 | 中等 | port-adapter、rust、runtime | 0 | 执行 apply batch 流程，并在失败时回滚已取得的资源。 |
| apply_batch | 函数 | 2152–2197 | 简单 | port-adapter、rust、runtime | 0 | 执行 apply batch 流程，并在失败时回滚已取得的资源。 |
| apply_section_patch | 函数 | 2368–2406 | 简单 | port-adapter、rust、runtime | 0 | 执行 apply section patch 流程，并在失败时回滚已取得的资源。 |
| artifact_readiness | 函数 | 2032–2045 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 artifact readiness 步骤实现。 |
| assemble_artifact | 函数 | 2328–2346 | 简单 | port-adapter、rust、runtime | 0 | 执行 assemble artifact 流程，并在失败时回滚已取得的资源。 |
| binding_outcomes | 函数 | 1511–1624 | 中等 | port-adapter、rust、runtime | 0 | 运行时模块中的 binding outcomes 步骤实现。 |
| binding_request | 函数 | 1249–1276 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 binding request 步骤实现。 |
| bounded_citation_compute_text | 函数 | 390–418 | 简单 | port-adapter、rust、validation | 0 | 对 citation compute text 施加长度或数量上限，阻断越界输入。 |
| build | 函数 | 449–642 | 中等 | port-adapter、rust、runtime | 0 | 执行 build 流程，并在失败时回滚已取得的资源。 |
| build_index | 函数 | 968–990 | 简单 | port-adapter、rust、runtime | 0 | 执行 build index 流程，并在失败时回滚已取得的资源。 |
| build_index | 函数 | 927–960 | 简单 | port-adapter、rust、runtime | 0 | 执行 build index 流程，并在失败时回滚已取得的资源。 |
| build_index | 函数 | 1019–1040 | 简单 | port-adapter、rust、runtime | 0 | 执行 build index 流程，并在失败时回滚已取得的资源。 |
| [build_production_applications](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs/build_production_applications.md) | 函数 | 153–317 | 中等 | port-adapter、rust、runtime | 6 | 组合根：打开 canonical store 与 repository，按依赖顺序构造各 application 并交由运行时持有。 |
| canonical_records | 函数 | 1107–1121 | 简单 | port-adapter、rust、runtime | 0 | 判定 canonical records 条件是否成立。 |
| citation_compute_node | 函数 | 420–446 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 citation compute node 步骤实现。 |
| citation_node_kind | 函数 | 348–368 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 citation node kind 步骤实现。 |
| citation_paper_parts | 函数 | 370–381 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 citation paper parts 步骤实现。 |
| consume_related_items_sync_echo | 函数 | 132–150 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 consume related items sync echo 步骤实现。 |
| dedupe_outcomes | 函数 | 1640–1769 | 中等 | port-adapter、rust、runtime | 0 | 运行时模块中的 dedupe outcomes 步骤实现。 |
| dedupe_request | 函数 | 1412–1493 | 中等 | port-adapter、rust、runtime | 0 | 运行时模块中的 dedupe request 步骤实现。 |
| dedupe_title_candidates | 函数 | 1326–1410 | 中等 | port-adapter、rust、runtime | 0 | 运行时模块中的 dedupe title candidates 步骤实现。 |
| emit | 函数 | 1790–1887 | 中等 | port-adapter、rust、runtime | 0 | 记录 emit，用于诊断、观测或状态留痕。 |
| layout | 函数 | 734–843 | 中等 | port-adapter、rust、runtime | 0 | 运行时模块中的 layout 步骤实现。 |
| list_items_page | 函数 | 1979–1989 | 简单 | port-adapter、rust、read-path | 0 | 按分页查询items page，限制单次返回规模。 |
| matcher_groups | 函数 | 1169–1217 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 matcher groups 步骤实现。 |
| matcher_papers | 函数 | 1219–1247 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 matcher papers 步骤实现。 |
| merge_evidence_field | 函数 | 1626–1638 | 简单 | port-adapter、rust、runtime | 0 | 聚合 merge evidence field，对来源做归并与去重。 |
| metrics | 函数 | 644–732 | 中等 | port-adapter、rust、read-path | 0 | 运行时模块中的 metrics 步骤实现。 |
| NativeCitationGraphComputePort | 类 | 341–343 | 简单 | port-adapter、rust、type、lifecycle | 0 | Citation Graph compute port 的 native 实现：把 repository 记录投影为 worker 协议并消费 worker 结果。 |
| NativeConceptKbComputePort | 类 | 963–965 | 简单 | port-adapter、rust、type、lifecycle | 0 | Concept KB compute port 的 native 实现：构建概念索引并支持查询。 |
| NativeReferenceObservationPort | 类 | 1787–1787 | 简单 | port-adapter、rust、type、lifecycle | 0 | Reference 观测 port：采集 reference 侧证据供 matcher 与去重使用。 |
| NativeStructuredArtifactPort | 类 | 2304–2306 | 简单 | port-adapter、rust、type、lifecycle | 0 | 结构化 artifact port：校验 manifest、组装并写入 artifact 内容。 |
| NativeTagAuditRuntimePort | 类 | 319–322 | 简单 | port-adapter、rust、type、lifecycle | 0 | 标签审阅运行时 port 的 native 实现，连接审阅记录与领域 application。 |
| NativeTagVocabularyComputePort | 类 | 846–848 | 简单 | port-adapter、rust、type、lifecycle | 0 | 标签词表 compute port 的 native 实现：把候选词、别名与缩写投影为 worker 索引输入。 |
| observation_scope | 函数 | 1895–1905 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 observation scope 步骤实现。 |
| opaque_id | 函数 | 329–338 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 opaque id 步骤实现。 |
| ProductionApplications | 类 | 82–102 | 简单 | port-adapter、rust、type、lifecycle | 0 | 已装配的生产应用集合：canonical store、repository 与各领域 application 的持有者。 |
| query | 函数 | 992–1011 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 query 步骤实现。 |
| read | 函数 | 1965–1975 | 简单 | port-adapter、rust、read-path | 0 | 读取，在 basis 校验后返回有界结果。 |
| read | 函数 | 2061–2071 | 简单 | port-adapter、rust、read-path | 0 | 读取，在 basis 校验后返回有界结果。 |
| read | 函数 | 2075–2087 | 简单 | port-adapter、rust、read-path | 0 | 读取，在 basis 校验后返回有界结果。 |
| read_artifact | 函数 | 2047–2057 | 简单 | port-adapter、rust、read-path | 0 | 读取 artifact，在 basis 校验后返回有界结果。 |
| redirect_map | 函数 | 1123–1145 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 redirect map 步骤实现。 |
| reference_matcher_outcomes | 函数 | 1771–1780 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 reference matcher outcomes 步骤实现。 |
| reference_matcher_request | 函数 | 1495–1509 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 reference matcher request 步骤实现。 |
| resolve | 函数 | 2201–2269 | 中等 | port-adapter、rust、runtime | 0 | 执行 resolve 流程，并在失败时回滚已取得的资源。 |
| resolve_matcher_canonical | 函数 | 1147–1167 | 简单 | port-adapter、rust、runtime | 0 | 执行 resolve matcher canonical 流程，并在失败时回滚已取得的资源。 |
| ReverseHostApplicationPort | 类 | 1782–1785 | 简单 | port-adapter、rust、type、lifecycle | 0 | 反向 Host 调用 port：把领域层需要宿主能力的需求转成 reverse host capability 调用。 |
| scan_artifacts_page | 函数 | 2013–2030 | 简单 | port-adapter、rust、runtime | 0 | 按分页查询artifacts page，限制单次返回规模。 |
| stored_identifiers | 函数 | 1278–1324 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 stored identifiers 步骤实现。 |
| tag_worker_abbrevs | 函数 | 879–892 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 tag worker abbrevs 步骤实现。 |
| tag_worker_entries | 函数 | 850–867 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 tag worker entries 步骤实现。 |
| test_checkpoint_root | 函数 | 112–122 | 简单 | port-adapter、rust、runtime | 0 | 运行时模块中的 test checkpoint root 步骤实现。 |
| validate | 函数 | 904–925 | 简单 | port-adapter、rust、validation | 0 | 校验  的结构、版本与预算约束，拒绝不合规输入。 |
| validate_artifact | 函数 | 2348–2366 | 简单 | port-adapter、rust、validation | 0 | 校验  artifact 的结构、版本与预算约束，拒绝不合规输入。 |
| validate_manifest | 函数 | 2309–2326 | 简单 | port-adapter、rust、validation | 0 | 校验  manifest 的结构、版本与预算约束，拒绝不合规输入。 |
| write_text | 函数 | 2290–2301 | 简单 | port-adapter、rust、write-path | 0 | 写出 text，保证顺序、页身份与提交时机正确。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_canonical_autosync.rs](runtime_canonical_autosync.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs | canonical 自动同步协调器：观察 canonical 提交后去抖触发 WebDAV 同步，并以 maintenance guard 与 canonical_commit 串行化写入。 |
| [runtime_contract.rs](runtime_contract.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs | 跨边界契约层：定义 NativeLaunchConfig、sidecar 能力清单、bundle manifest 校验，并构造 discovery、health 与 handshake 文档。 |
| [runtime_diagnostics.rs](runtime_diagnostics.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs | 诊断与可观测性：管理 TraceContext 父子传播、NativeDiagnosticEvent 构造与发射，以及启动期事件捕获与 trace 锚点解除。 |
| [runtime_host_collection.rs](runtime_host_collection.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs | Zotero Host 条目采集：实现 TopicLibraryQueryPort 的分页与按 ref 批量读取适配，把宿主条目转换为领域 TopicLibraryItem。 |
| [runtime_reverse_host.rs](runtime_reverse_host.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs | 反向 Host 调用客户端：向插件侧 /synthesis/v1/host-call 发起请求，实施响应头与响应体限界，并保证 trace 上下文跨进程传播。 |
| [runtime_test_checkpoint.rs](runtime_test_checkpoint.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_test_checkpoint.rs | 进程级测试检查点：以 armed/held/release 文件协议让集成测试在 sidecar 的特定时序点精确阻塞，用于确定性验证中间态。 |
| [runtime_webdav_runtime.rs](runtime_webdav_runtime.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs | WebDAV 运行时适配：以文件状态存储保存同步状态（原子写入），并提供可被停止信号中断的重试调度器。 |
| [runtime_worker_pool.rs](runtime_worker_pool.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs | 计算 worker 池：负责子进程 spawn 与就绪握手、direct 与 paged 两条执行路径、admission 预留与故障隔离，并校验直接执行结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_artifact_library_debug.rs](runtime_artifact_library_debug.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs | Artifact Library 调试与导出面：扫描 artifact 描述符、分页读取内容、构建导出计划，并把导出结果组装为 Markdown 或宿主可写文本。 |
| [runtime_capabilities.rs](runtime_capabilities.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs | capability 分发中枢：解析 call envelope，按 capability 路由到各 public surface、compute worker pool 与 transfer owner，并对请求与响应施加体积和 JSON 深度限界。 |
| [runtime_citation_graph_commands.rs](runtime_citation_graph_commands.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs | Citation Graph 写命令面：实现 update/retry/layout/metrics/rebuild 的 admission、durable facts 采集，以及每次 dispatch 都新建的私有 rebuild attempt 派发。 |
| [runtime_citation_graph_read_surface.rs](runtime_citation_graph_read_surface.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs | Citation Graph 读面：按 graph/input/metrics basis 校验后读取窗口、邻域、指标与布局，在响应预算内完成有界切片与分页投影。 |
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
| [build_production_applications](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs/build_production_applications.md) | 函数 | 153–317 | 组合根：打开 canonical store 与 repository，按依赖顺序构造各 application 并交由运行时持有。 |
| consume_related_items_sync_echo | 函数 | 132–150 | 运行时模块中的 consume related items sync echo 步骤实现。 |
| ProductionApplications | 类 | 82–102 | 已装配的生产应用集合：canonical store、repository 与各领域 application 的持有者。 |
| ReverseHostApplicationPort | 类 | 1782–1785 | 反向 Host 调用 port：把领域层需要宿主能力的需求转成 reverse host capability 调用。 |
| test_checkpoint_root | 函数 | 112–122 | 运行时模块中的 test checkpoint root 步骤实现。 |
