
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs -->

Citation Graph 读面：按 graph/input/metrics basis 校验后读取窗口、邻域、指标与布局，在响应预算内完成有界切片与分页投影。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs)

## 符号（33）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:authors -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:bounded_identifier -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:bounded_overview -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:bounded_slice -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:dispatch -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:empty_layout_result -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:GraphLayoutReadDto -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:GraphQueryDto -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:GraphSliceDto -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:layout_result -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:layout_status -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:metrics -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:normalized_filter -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:project_review_graph -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:public_edge -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:public_metric -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:public_node -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:query_signature -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:read_graph_window -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:read_topic_scopes -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:resolve_topic_filter -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:roles -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:selected_algorithm -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:string_array -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:string_list_field -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:typed_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:usize_field -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:window_page_metadata -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:window_public_edge -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:window_public_node -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:window_ui_edge -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:window_ui_node -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs:workbench_graph_surface -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| authors | 函数 | 301–310 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 authors 步骤实现。 |
| bounded_identifier | 函数 | 316–333 | 简单 | citation-graph、rust、validation | 0 | 对 identifier 施加长度或数量上限，阻断越界输入。 |
| bounded_overview | 函数 | 946–1003 | 中等 | citation-graph、rust、validation | 0 | 生成有界的图概览投影，限制节点与边规模。 |
| bounded_slice | 函数 | 1005–1071 | 中等 | citation-graph、rust、validation | 0 | 按预算裁剪切片，保证单次响应不超预算。 |
| [dispatch](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs/dispatch.md) | 函数 | 1426–1452 | 简单 | citation-graph、rust、routing | 3 | Citation Graph 读命令分发：路由 window、neighborhood、metrics、layout 与 workbench 投影。 |
| empty_layout_result | 函数 | 1170–1179 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 empty layout result 步骤实现。 |
| GraphLayoutReadDto | 类 | 163–194 | 简单 | citation-graph、rust、type、lifecycle | 0 | 布局读取结果 wire DTO，含算法、坐标与布局状态。 |
| GraphQueryDto | 类 | 91–126 | 简单 | citation-graph、rust、type、lifecycle | 0 | 图查询请求的 wire DTO，承载窗口、过滤、方向与 limits。 |
| GraphSliceDto | 类 | 138–159 | 简单 | citation-graph、rust、type、lifecycle | 0 | 图切片 wire DTO，含节点、边与分页元数据。 |
| layout_result | 函数 | 1181–1424 | 复杂 | citation-graph、rust、runtime | 0 | 布局读取：按算法与 limits 产出有界布局结果，超出预算时降级为占位布局。 |
| layout_status | 函数 | 775–803 | 简单 | citation-graph、rust、runtime | 0 | 读取布局状态：算法、版本与是否处于陈旧/失败状态。 |
| metrics | 函数 | 1086–1136 | 中等 | citation-graph、rust、read-path | 0 | 读取图指标并投影为 wire DTO，指标 identity 变化时由写面先行刷新。 |
| normalized_filter | 函数 | 492–517 | 简单 | citation-graph、rust、runtime | 0 | 规范化过滤条件，使等价过滤共享同一 basis signature。 |
| project_review_graph | 函数 | 413–468 | 中等 | citation-graph、rust、wire-projection | 1 | 把审阅用图投影为独立形态，字段更少且与交互图解耦。 |
| public_edge | 函数 | 389–411 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 public edge 步骤实现。 |
| public_metric | 函数 | 1073–1084 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 public metric 步骤实现。 |
| public_node | 函数 | 361–387 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 public node 步骤实现。 |
| query_signature | 函数 | 519–532 | 简单 | citation-graph、rust、runtime | 0 | 由查询条件计算 signature，作为短事务内 basis 复核的一部分。 |
| read_graph_window | 函数 | 567–665 | 中等 | citation-graph、rust、read-path | 0 | 按 basis 与窗口限制读取图切片，每次调用开启短 reader transaction 并重新校验 basis。 |
| read_topic_scopes | 函数 | 250–299 | 简单 | citation-graph、rust、read-path | 0 | 解析 topic scope 过滤条件，返回有界的 topic 作用域集合。 |
| resolve_topic_filter | 函数 | 534–565 | 简单 | citation-graph、rust、runtime | 0 | 把 topic 过滤输入解析为可执行的过滤集合。 |
| roles | 函数 | 335–359 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 roles 步骤实现。 |
| selected_algorithm | 函数 | 764–773 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 selected algorithm 步骤实现。 |
| string_array | 函数 | 470–483 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 string array 步骤实现。 |
| string_list_field | 函数 | 1138–1155 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 string list field 步骤实现。 |
| typed_request | 函数 | 218–231 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 typed request 步骤实现。 |
| usize_field | 函数 | 925–937 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 usize field 步骤实现。 |
| window_page_metadata | 函数 | 742–762 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 window page metadata 步骤实现。 |
| window_public_edge | 函数 | 712–729 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 window public edge 步骤实现。 |
| window_public_node | 函数 | 667–692 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 window public node 步骤实现。 |
| window_ui_edge | 函数 | 731–740 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 window ui edge 步骤实现。 |
| window_ui_node | 函数 | 694–710 | 简单 | citation-graph、rust、runtime | 0 | Citation Graph 读写面中的 window ui node 步骤实现。 |
| workbench_graph_surface | 函数 | 805–923 | 中等 | citation-graph、rust、runtime | 1 | 组装 Workbench 用的 citation graph surface：节点、边、指标与选中项的统一投影。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [dispatch](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs/dispatch.md) | 函数 | 1426–1452 | Citation Graph 读命令分发：路由 window、neighborhood、metrics、layout 与 workbench 投影。 |
| project_review_graph | 函数 | 413–468 | 把审阅用图投影为独立形态，字段更少且与交互图解耦。 |
| workbench_graph_surface | 函数 | 805–923 | 组装 Workbench 用的 citation graph surface：节点、边、指标与选中项的统一投影。 |
