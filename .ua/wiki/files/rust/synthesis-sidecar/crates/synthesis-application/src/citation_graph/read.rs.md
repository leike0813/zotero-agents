
# rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs
所属分层：[Synthesis 领域与侧车](../../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph](../../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs -->

引用图谱读路径子模块：实现 basis-bound 的 page/continuation/neighborhood 读取，短 reader transaction 内重新校验 basis 并对过期游标以 basis_mismatch 失败。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs)

## 符号（10）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs:CitationGraphBasis -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs:CitationGraphFilter -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs:CitationGraphPage -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs:CitationGraphReadView -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs:decode_cursor -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs:metrics -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs:neighborhood -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs:page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs:roles -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs:WindowCursor -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CitationGraphBasis | 类 | 18–22 | 简单 | rust、B、a、s | 0 | 读视图 basis：记录 graph/input/metrics 三类基准，读取时必须重新校验，不匹配即 basis_mismatch 失败。 |
| CitationGraphFilter | 类 | 36–46 | 简单 | rust、F、i、l | 0 | 引用图查询过滤条件，限定文献范围、方向与时间窗。 |
| CitationGraphPage | 类 | 131–148 | 简单 | rust、P、a、g | 0 | basis-bound 图页：节点、边与角色证据的一页投影，带稳定身份供前端增量渲染。 |
| CitationGraphReadView | 类 | 236–239 | 简单 | rust、V、i、e | 0 | 引用图读视图聚合体：对外提供 page、continuation、neighborhood 与 metrics 的统一读入口。 |
| decode_cursor | 函数 | 481–503 | 简单 | rust、游标、校验、读路径 | 0 | 解码并校验分页游标，游标与当前 basis 不匹配时拒绝继续读取。 |
| metrics | 函数 | 313–344 | 简单 | rust、metrics、分页、读路径 | 0 | 读取引用指标页，按排序键与窗口游标分页，保证同一 basis 内的稳定顺序。 |
| neighborhood | 函数 | 269–295 | 简单 | rust、邻域、读路径、citation-graph | 0 | 读取选中节点的有界邻域，cursor 过期或 metrics identity 变化时直接拒绝混合结果。 |
| page | 函数 | 355–445 | 中等 | rust、分页、读路径、basis | 0 | basis-bound 分页读取：开启短 reader transaction 并重新校验 basis，basis 变化时以 basis_mismatch 失败。 |
| roles | 函数 | 528–554 | 简单 | rust、投影、角色证据、citation-graph | 0 | 解析节点在引用图中的角色证据，为前端渲染提供可解释的角色标注。 |
| WindowCursor | 类 | 228–233 | 简单 | rust | 0 | 有界读取游标：记录窗口位置与 basis，用于 continuation 读取并防止跨 basis 混页。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ports.rs](../ports.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs | 应用层 port trait 集合：声明 RepositoryPort、Host facts 收集与维护路由等能力边界，是 application 层唯一允许依赖的抽象接口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| CitationGraphBasis | 类 | 18–22 | 读视图 basis：记录 graph/input/metrics 三类基准，读取时必须重新校验，不匹配即 basis_mismatch 失败。 |
| CitationGraphFilter | 类 | 36–46 | 引用图查询过滤条件，限定文献范围、方向与时间窗。 |
| CitationGraphPage | 类 | 131–148 | basis-bound 图页：节点、边与角色证据的一页投影，带稳定身份供前端增量渲染。 |
| CitationGraphReadView | 类 | 236–239 | 引用图读视图聚合体：对外提供 page、continuation、neighborhood 与 metrics 的统一读入口。 |
| WindowCursor | 类 | 228–233 | 有界读取游标：记录窗口位置与 basis，用于 continuation 读取并防止跨 basis 混页。 |
