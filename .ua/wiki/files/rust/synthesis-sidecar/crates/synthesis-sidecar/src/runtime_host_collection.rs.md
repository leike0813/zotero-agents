
# rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-sidecar/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-sidecar/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs -->

Zotero Host 条目采集：实现 TopicLibraryQueryPort 的分页与按 ref 批量读取适配，把宿主条目转换为领域 TopicLibraryItem。
源码：[rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs)

## 符号（6）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs:collect_host_items -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs:get_items_by_ref -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs:HostItemCollectionPort -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs:list_items_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs:topic_library_item -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs:TopicLibraryQueryAdapter -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collect_host_items | 函数 | 71–86 | 简单 | host-adapter、rust、runtime | 1 | 按分页参数从 Zotero 宿主采集条目并转换为领域结构，页大小有上限。 |
| get_items_by_ref | 函数 | 46–55 | 简单 | host-adapter、rust、read-path | 0 | 按分页查询items by ref，限制单次返回规模。 |
| HostItemCollectionPort | 类 | 13–18 | 简单 | host-adapter、rust、type、lifecycle | 0 | 宿主条目采集 port 抽象，隔离 runtime 与 Zotero API 细节。 |
| list_items_page | 函数 | 31–44 | 简单 | host-adapter、rust、read-path | 0 | 按分页查询items page，限制单次返回规模。 |
| topic_library_item | 函数 | 58–69 | 简单 | host-adapter、rust、runtime | 0 | 构造或转换 topic library item 所需的中间结构。 |
| TopicLibraryQueryAdapter | 类 | 20–22 | 简单 | host-adapter、rust、type、lifecycle | 0 | TopicLibraryQueryPort 适配器：把领域查询翻译为宿主读取并回收分页结果。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs | Synthesis sidecar 的 crate 根模块：声明全部 runtime_* 子模块构成生产运行时 module graph，对外仅重导出 serve/worker 两个入口与生命周期失败类型。 |
| [runtime_citation_graph_commands.rs](runtime_citation_graph_commands.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs | Citation Graph 写命令面：实现 update/retry/layout/metrics/rebuild 的 admission、durable facts 采集，以及每次 dispatch 都新建的私有 rebuild attempt 派发。 |
| [runtime_production_ports.rs](runtime_production_ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs | 生产端口装配：以 build_production_applications 组装 ProductionApplications，并实现 citation graph compute、tag vocabulary、concept KB、reference matcher、artifact 与 reverse host 等 native port adapter。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| collect_host_items | 函数 | 71–86 | 按分页参数从 Zotero 宿主采集条目并转换为领域结构，页大小有上限。 |
| HostItemCollectionPort | 类 | 13–18 | 宿主条目采集 port 抽象，隔离 runtime 与 Zotero API 细节。 |
| TopicLibraryQueryAdapter | 类 | 20–22 | TopicLibraryQueryPort 适配器：把领域查询翻译为宿主读取并回收分页结果。 |
