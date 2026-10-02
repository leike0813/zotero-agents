
# rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs -->

Reference 领域模型：定义文献条目的规范身份、字段语义与派生视图，充当匹配、刷新与展示的公共结构来源。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs)

## 符号（5）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs:collect_host_item_pages_with_checkpoint -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs:ReferenceHostItem -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs:ReferenceHostPort -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs:ReferenceIndexProjection -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs:validate_page_metadata -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collect_host_item_pages_with_checkpoint | 函数 | 366–418 | 中等 | rust、宿主投影、分页、检查点 | 0 | 带检查点分页收集宿主文献条目，checkpoint 让大库读取可续跑而不重复拉取。 |
| ReferenceHostItem | 类 | 107–126 | 简单 | rust、I、t、e | 0 | 宿主文献条目：承载 Zotero 侧原始字段与身份标识，作为匹配与刷新的输入。 |
| ReferenceHostPort | 类 | 201–222 | 简单 | rust、P、o、r | 0 | 文献 Host 端口：声明从 Zotero 宿主读取条目、附件与 artifact 的能力边界。 |
| ReferenceIndexProjection | 类 | 59–70 | 简单 | rust | 0 | 文献索引投影：由索引快照派生的规范条目视图，是列表与检索的读来源。 |
| validate_page_metadata | 函数 | 473–491 | 简单 | rust、校验、分页、一致性 | 0 | 校验分页元数据的页码、游标与 snapshot 一致性，防止混页。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [reference_application.rs](reference_application.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs | Reference 应用层最大模块：编排文献身份匹配、刷新、canonical artifact 落地与跨域投影，是文献写入路径的编排中枢。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ReferenceHostItem | 类 | 107–126 | 宿主文献条目：承载 Zotero 侧原始字段与身份标识，作为匹配与刷新的输入。 |
| ReferenceHostPort | 类 | 201–222 | 文献 Host 端口：声明从 Zotero 宿主读取条目、附件与 artifact 的能力边界。 |
| ReferenceIndexProjection | 类 | 59–70 | 文献索引投影：由索引快照派生的规范条目视图，是列表与检索的读来源。 |
