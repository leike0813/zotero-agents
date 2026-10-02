
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs -->

Topic Workbench 投影面：把 topic、concept、topic graph 的领域记录投影为有界 wire DTO，清洗审阅工件，并组装 workflow review 输入。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs)

## 符号（40）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:concept_alias_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:concept_projection -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:concept_record_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:concept_relation_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:concept_review -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:concept_review_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:concept_sense_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:decode_find_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:decode_resolver -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:decode_surface -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:decode_topic_context -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:planned_workflow_options -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:project_coverage -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:project_manifest -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:project_metadata -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:project_object -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:project_resolved_paper -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:project_string_list -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:project_text_summary -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:project_topic_artifact -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:reader -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:ResolverTagWire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:review_page_query -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:review_registry_rows -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:review_summary -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:sanitize_review_artifact -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:tags -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_concept_link_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_detail_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_graph_edge_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_graph_node_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_graph_projection -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_graph_review -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_graph_review_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_list_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_planning_context -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_projection -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topic_record_wire -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:topics -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs:workflow_review_input -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| concept_alias_wire | 函数 | 638–650 | 简单 | workbench、rust、wire-projection | 0 | 把concept alias投影为对外 wire DTO，剔除内部字段并施加有界限制。 |
| concept_projection | 函数 | 705–745 | 简单 | workbench、rust、runtime | 0 | 把 Concept KB snapshot 投影为含 sense、alias、relation 与 review 项的 wire 结构。 |
| concept_record_wire | 函数 | 601–617 | 简单 | workbench、rust、wire-projection | 0 | 把concept record投影为对外 wire DTO，剔除内部字段并施加有界限制。 |
| concept_relation_wire | 函数 | 652–664 | 简单 | workbench、rust、wire-projection | 0 | 把concept relation投影为对外 wire DTO，剔除内部字段并施加有界限制。 |
| concept_review | 函数 | 1523–1542 | 简单 | workbench、rust、runtime | 0 | Topic Workbench 投影面中的 concept review 步骤实现。 |
| concept_review_wire | 函数 | 666–689 | 简单 | workbench、rust、wire-projection | 0 | 把concept review投影为对外 wire DTO，剔除内部字段并施加有界限制。 |
| concept_sense_wire | 函数 | 619–636 | 简单 | workbench、rust、wire-projection | 0 | 把concept sense投影为对外 wire DTO，剔除内部字段并施加有界限制。 |
| decode_find_request | 函数 | 1212–1225 | 简单 | workbench、rust、runtime | 0 | 解码 find request 请求参数，校验字段并施加取值上限。 |
| decode_resolver | 函数 | 1325–1361 | 简单 | workbench、rust、runtime | 0 | 解析 resolver 参数，决定 topic 解析策略。 |
| decode_surface | 函数 | 1373–1392 | 简单 | workbench、rust、runtime | 0 | 解析 surface 选择参数，映射到对应投影分支。 |
| decode_topic_context | 函数 | 1308–1323 | 简单 | workbench、rust、runtime | 0 | 解码 topic context 请求参数，校验字段并施加取值上限。 |
| planned_workflow_options | 函数 | 1235–1281 | 简单 | workbench、rust、runtime | 0 | 列出当前 topic 可用的工作流选项，供 UI 选择。 |
| project_coverage | 函数 | 879–905 | 简单 | workbench、rust、wire-projection | 0 | 投影覆盖度统计，限制维度数量。 |
| project_manifest | 函数 | 965–1005 | 简单 | workbench、rust、wire-projection | 0 | 投影产物 manifest 为有界对象。 |
| project_metadata | 函数 | 1007–1046 | 简单 | workbench、rust、wire-projection | 0 | 投影元数据为受控字段集合，剔除内部键。 |
| project_object | 函数 | 766–780 | 简单 | workbench、rust、wire-projection | 0 | 将 object 投影为受控字段集合的对外结构。 |
| project_resolved_paper | 函数 | 800–866 | 中等 | workbench、rust、wire-projection | 0 | 投影已解析文献条目，去除宿主内部标识并限制字段长度。 |
| project_string_list | 函数 | 782–798 | 简单 | workbench、rust、wire-projection | 0 | 将 string list 投影为受控字段集合的对外结构。 |
| project_text_summary | 函数 | 868–877 | 简单 | workbench、rust、wire-projection | 0 | 生成受长度约束的文本摘要。 |
| project_topic_artifact | 函数 | 907–963 | 中等 | workbench、rust、wire-projection | 0 | 投影 topic 产物，限制清单与正文规模。 |
| reader | 函数 | 1567–1584 | 简单 | workbench、rust、read-path | 0 | 读取er，在 basis 校验后返回有界结果。 |
| ResolverTagWire | 类 | 1170–1177 | 简单 | workbench、rust、type、lifecycle | 0 | resolver 标签 wire DTO，描述一个解析标签及其指向。 |
| review_page_query | 函数 | 432–478 | 简单 | workbench、rust、runtime | 0 | 解析审阅分页查询参数，施加 review bound 上限后返回合法页查询。 |
| review_registry_rows | 函数 | 100–156 | 中等 | workbench、rust、runtime | 0 | 把审阅记录投影为 registry 行，字段有界且按目标类型分派。 |
| review_summary | 函数 | 1423–1456 | 简单 | workbench、rust、runtime | 0 | 汇总审阅统计：总量、已决与待决分布。 |
| sanitize_review_artifact | 函数 | 68–82 | 简单 | workbench、rust、runtime | 0 | 清洗审阅工件：剥离内部字段并限制时间线与改进维度规模。 |
| tags | 函数 | 1548–1558 | 简单 | workbench、rust、runtime | 0 | Topic Workbench 投影面中的 tags 步骤实现。 |
| topic_concept_link_wire | 函数 | 691–703 | 简单 | workbench、rust、wire-projection | 0 | 把topic concept link投影为对外 wire DTO，剔除内部字段并施加有界限制。 |
| topic_detail_wire | 函数 | 1048–1116 | 中等 | workbench、rust、wire-projection | 0 | 投影 topic 详情为 wire DTO，含 concept 链接、覆盖度与产物摘要。 |
| topic_graph_edge_wire | 函数 | 537–550 | 简单 | workbench、rust、wire-projection | 0 | 把topic graph edge投影为对外 wire DTO，剔除内部字段并施加有界限制。 |
| topic_graph_node_wire | 函数 | 517–535 | 简单 | workbench、rust、wire-projection | 0 | 把topic graph node投影为对外 wire DTO，剔除内部字段并施加有界限制。 |
| topic_graph_projection | 函数 | 569–599 | 简单 | workbench、rust、runtime | 0 | 把 Topic Graph snapshot 投影为节点、边与审阅项三部分。 |
| topic_graph_review | 函数 | 1500–1521 | 简单 | workbench、rust、runtime | 0 | 构造或转换 topic graph review 所需的中间结构。 |
| topic_graph_review_wire | 函数 | 552–567 | 简单 | workbench、rust、wire-projection | 0 | 把topic graph review投影为对外 wire DTO，剔除内部字段并施加有界限制。 |
| topic_list_wire | 函数 | 747–764 | 简单 | workbench、rust、wire-projection | 0 | 投影 topic 列表，限制条目数与每条文本长度。 |
| topic_planning_context | 函数 | 1283–1306 | 简单 | workbench、rust、runtime | 0 | 组装 topic 规划上下文，作为工作流评审输入的一部分。 |
| topic_projection | 函数 | 1399–1421 | 简单 | workbench、rust、runtime | 0 | 投影单个 topic 为 Workbench wire 形态。 |
| topic_record_wire | 函数 | 480–505 | 简单 | workbench、rust、wire-projection | 0 | 把topic record投影为对外 wire DTO，剔除内部字段并施加有界限制。 |
| topics | 函数 | 1472–1482 | 简单 | workbench、rust、runtime | 0 | 构造或转换 topics 所需的中间结构。 |
| workflow_review_input | 函数 | 158–423 | 复杂 | workbench、rust、runtime | 0 | 组装 workflow review 输入：把 topic/concept/review 投影与解析结果汇成工作流可消费的输入，含有界文本与覆盖度摘要。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |
| [runtime_public_maintenance_operation.rs](runtime_public_maintenance_operation.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs | public maintenance 生命周期的唯一 owner：admission、dispatch、running/terminal 迁移、cancel/retry/continue，以及启动期重启对账，只返回 typed view 与 receipt。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
