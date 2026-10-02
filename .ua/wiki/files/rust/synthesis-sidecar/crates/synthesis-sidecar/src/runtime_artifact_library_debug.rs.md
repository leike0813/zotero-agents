
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs -->

Artifact Library 调试与导出面：扫描 artifact 描述符、分页读取内容、构建导出计划，并把导出结果组装为 Markdown 或宿主可写文本。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs)

## 符号（32）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:all_library_items -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:all_topics -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:artifact_from_descriptor -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:compact_authors -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:compact_references -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:complete_library_index -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:counted -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:debug_cache_list -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:debug_operations_list -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:demote_markdown_headings -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:export -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:export_content -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:export_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:filter_digest_export_markdown -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:host_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:library_index -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:limit -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:literature_quality -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:manifest -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:offset -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:page_debug -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:page_named -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:prepare_export -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:read_artifacts_for_request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:rebuild_export_plan -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:remove_citation_wrapper_and_trailing_section -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:resolve_topic_paper_digest -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:safe_file_segment -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:scan_descriptors -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:string_list -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:validate_artifact_filter -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs:validate_strings -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| all_library_items | 函数 | 1108–1141 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 all library items 步骤实现。 |
| all_topics | 函数 | 1290–1301 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 all topics 步骤实现。 |
| artifact_from_descriptor | 函数 | 375–487 | 中等 | artifact-library、rust、runtime | 0 | crate 根模块中的 artifact from descriptor 步骤实现。 |
| compact_authors | 函数 | 812–829 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 compact authors 步骤实现。 |
| compact_references | 函数 | 831–848 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 compact references 步骤实现。 |
| complete_library_index | 函数 | 1143–1181 | 简单 | artifact-library、rust、runtime | 1 | crate 根模块中的 complete library index 步骤实现。 |
| counted | 函数 | 1266–1289 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 counted 步骤实现。 |
| debug_cache_list | 函数 | 1337–1360 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 debug cache list 步骤实现。 |
| debug_operations_list | 函数 | 1361–1379 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 debug operations list 步骤实现。 |
| demote_markdown_headings | 函数 | 735–759 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 demote markdown headings 步骤实现。 |
| export | 函数 | 591–611 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 export 步骤实现。 |
| export_content | 函数 | 856–924 | 中等 | artifact-library、rust、runtime | 0 | crate 根模块中的 export content 步骤实现。 |
| export_request | 函数 | 673–705 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 export request 步骤实现。 |
| filter_digest_export_markdown | 函数 | 761–779 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 filter digest export markdown 步骤实现。 |
| host_request | 函数 | 305–328 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 host request 步骤实现。 |
| library_index | 函数 | 1183–1256 | 中等 | artifact-library、rust、runtime | 0 | crate 根模块中的 library index 步骤实现。 |
| limit | 函数 | 278–287 | 简单 | artifact-library、rust、runtime | 0 | 对 limit 施加长度或数量上限，阻断越界输入。 |
| literature_quality | 函数 | 926–944 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 literature quality 步骤实现。 |
| manifest | 函数 | 547–572 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 manifest 步骤实现。 |
| offset | 函数 | 289–303 | 简单 | artifact-library、rust、runtime | 0 | 对 offset 施加长度或数量上限，阻断越界输入。 |
| page_debug | 函数 | 1380–1391 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 page debug 步骤实现。 |
| page_named | 函数 | 1302–1328 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 page named 步骤实现。 |
| prepare_export | 函数 | 946–1101 | 中等 | artifact-library、rust、runtime | 0 | 执行 prepare export 流程，并在失败时回滚已取得的资源。 |
| read_artifacts_for_request | 函数 | 499–545 | 简单 | artifact-library、rust、read-path | 0 | 读取 artifacts for request，在 basis 校验后返回有界结果。 |
| rebuild_export_plan | 函数 | 613–663 | 中等 | artifact-library、rust、runtime | 1 | 执行 rebuild export plan 流程，并在失败时回滚已取得的资源。 |
| remove_citation_wrapper_and_trailing_section | 函数 | 781–810 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 remove citation wrapper and trailing section 步骤实现。 |
| resolve_topic_paper_digest | 函数 | 186–236 | 中等 | artifact-library、rust、runtime | 0 | 执行 resolve topic paper digest 流程，并在失败时回滚已取得的资源。 |
| safe_file_segment | 函数 | 715–733 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 safe file segment 步骤实现。 |
| scan_descriptors | 函数 | 330–363 | 简单 | artifact-library、rust、runtime | 0 | 按分页查询descriptors，限制单次返回规模。 |
| string_list | 函数 | 258–276 | 简单 | artifact-library、rust、runtime | 0 | crate 根模块中的 string list 步骤实现。 |
| validate_artifact_filter | 函数 | 165–184 | 简单 | artifact-library、rust、validation | 0 | 校验  artifact filter 的结构、版本与预算约束，拒绝不合规输入。 |
| validate_strings | 函数 | 154–163 | 简单 | artifact-library、rust、validation | 0 | 校验  strings 的结构、版本与预算约束，拒绝不合规输入。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime_production_client.rs](runtime_production_client.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs | 生产 client 目录：解析内嵌的 capability/operation manifest，构建路由表、访问与数据面策略模型，并维护 operation 分类、receipt 与 typed dispatch。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| complete_library_index | 函数 | 1143–1181 | crate 根模块中的 complete library index 步骤实现。 |
| rebuild_export_plan | 函数 | 613–663 | 执行 rebuild export plan 流程，并在失败时回滚已取得的资源。 |
