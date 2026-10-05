
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs -->

Citation Graph 写命令面：实现 update/retry/layout/metrics/rebuild 的 admission、durable facts 采集，以及每次 dispatch 都新建的私有 rebuild attempt 派发。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs)

## 符号（13）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:affected_source_refs -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:build_input -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:collect_items_by_ref -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:dispatch -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:durable_facts -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:parse_roles -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:parse_string_list -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:recompute_layout -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:refresh_metrics -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:retry -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:run_rebuild -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:stale_delta -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs:start_update -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| affected_source_refs | 函数 | 198–215 | 简单 | citation-graph、rust、runtime | 0 | 依据陈旧增量计算受影响的 source reference 集合。 |
| build_input | 函数 | 275–396 | 中等 | citation-graph、rust、runtime | 0 | 把 durable facts 与受影响来源组装为 worker build 输入，并施加 source/reference/target 数量上限。 |
| collect_items_by_ref | 函数 | 217–249 | 简单 | citation-graph、rust、runtime | 0 | 按 ref 集合分批采集条目事实，避免一次性把全库读入内存。 |
| [dispatch](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs/dispatch.md) | 函数 | 636–656 | 简单 | citation-graph、rust、routing | 2 | Citation Graph 写命令分发：把 typed 请求路由到 update/retry/layout/metrics 处理。 |
| durable_facts | 函数 | 174–196 | 简单 | citation-graph、rust、runtime | 0 | 采集 durable facts：当前 graph hash、cache basis 与 Reference/Host 事实快照。 |
| parse_roles | 函数 | 255–273 | 简单 | citation-graph、rust、runtime | 0 | 解析 roles 输入并归一为内部强类型结构。 |
| parse_string_list | 函数 | 128–138 | 简单 | citation-graph、rust、runtime | 0 | 解析 string list 输入并归一为内部强类型结构。 |
| recompute_layout | 函数 | 569–600 | 简单 | citation-graph、rust、runtime | 0 | 在 metrics identity 变化后重算布局并刷新 layout 状态。 |
| refresh_metrics | 函数 | 555–567 | 简单 | citation-graph、rust、runtime | 0 | 刷新图指标并同步 metrics identity，供读面做 basis 校验。 |
| retry | 函数 | 606–634 | 简单 | citation-graph、rust、runtime | 0 | 无参 retry：只复用最近 failed attempt 的模式，随后按当前 cache、Reference 与 Host facts 重新规划。 |
| run_rebuild | 函数 | 398–511 | 中等 | citation-graph、rust、lifecycle | 0 | 执行一次 rebuild：创建新的私有 attempt、派发计算、收集失败并由 finish_rebuild 收敛。 |
| stale_delta | 函数 | 140–164 | 简单 | citation-graph、rust、runtime | 0 | 由 cache basis 记录推导出需要重建的来源范围与陈旧原因。 |
| start_update | 函数 | 513–553 | 简单 | citation-graph、rust、lifecycle | 0 | public update 命令：校验 admission 后开启新的 Full/Incremental rebuild attempt。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_host_collection.rs](runtime_host_collection.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs | Zotero Host 条目采集：实现 TopicLibraryQueryPort 的分页与按 ref 批量读取适配，把宿主条目转换为领域 TopicLibraryItem。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_public_maintenance_operation.rs](runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [dispatch](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs/dispatch.md) | 函数 | 636–656 | Citation Graph 写命令分发：把 typed 请求路由到 update/retry/layout/metrics 处理。 |
