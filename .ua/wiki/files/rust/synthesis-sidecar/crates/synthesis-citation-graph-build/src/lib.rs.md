
# rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs -->

引用图谱构建算法 crate，读取规范记录并计算节点、边与图谱度量等派生结果。
源码：[rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs)

## 符号（9）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:AggregateEdge -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:append_raw_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:compute -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:compute_typed -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:finish -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:GraphPagedInputAssembler -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:GraphResult -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:LibraryNode -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:primary_role -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| AggregateEdge | 类 | 247–255 | 中等 | citation-graph、边聚合、去重 | 0 | 聚合后的引用边，合并同一对 source/target 的多次提及并记录 role 计数与来源引用。 |
| [append_raw_page](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs/append_raw_page.md) | 函数 | 146–179 | 复杂 | 分页输入、输入校验、资源预算、citation-graph | 2 | 校验并追加一页原始输入：核对 descriptor 的 basis、累计 JSON 节点预算，超限即拒绝。 |
| compute | 函数 | 606–637 | 中等 | citation-graph、入口包装、契约版本 | 0 | 非分页入口的图谱计算包装，复用 compute_typed 语义并返回带契约版本的结果。 |
| [compute_typed](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs/compute_typed.md) | 函数 | 374–604 | 复杂 | citation-graph、核心算法、分页输入、取消、metrics | 1 | 类型化图谱计算主流程：装配库内节点、聚合引用边、绑定解析并产出节点、边与 metrics，全程响应取消信号。 |
| finish | 函数 | 181–205 | 中等 | 分页输入、一致性检查、citation-graph | 1 | 完成输入装配并做最终一致性检查，返回可计算的完整输入。 |
| GraphPagedInputAssembler | 类 | 117–121 | 中等 | citation-graph、分页输入、校验、装配器 | 0 | 分页输入装配器，按 page descriptor 校验并累积图谱构建的 paged input，产出完整输入后才允许开始计算。 |
| GraphResult | 类 | 280–288 | 中等 | citation-graph、计算结果、类型定义 | 0 | 图谱计算结果聚合体，持有节点、边、metrics 与布局身份，并可拆成可序列化的 section 结构。 |
| LibraryNode | 类 | 33–41 | 简单 | 类型定义、citation-graph、文献节点 | 1 | 库内文献节点输入，含 nodeId、标题、年份、作者与别名。 |
| primary_role | 函数 | 350–372 | 中等 | citation-graph、角色推导、启发式规则 | 1 | 按提及次数与角色计数推导一条边的 primary role，用于边状态与展示归类。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../synthesis-citation-layout/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs | 引用图谱布局计算 crate，依据图谱结构与度量计算 Sigma 节点位置、相机参数等布局身份。 |
