
# rust/synthesis-sidecar/crates/synthesis-tag-vocabulary/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-tag-vocabulary/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-tag-vocabulary/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-tag-vocabulary/src/lib.rs -->

标签词表 crate：定义受控标签集合、层级关系与标签归一化规则，供标签导入与综合层校验使用。
源码：[rust/synthesis-sidecar/crates/synthesis-tag-vocabulary/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-tag-vocabulary/src/lib.rs)

## 符号（2）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-tag-vocabulary/src/lib.rs:compute -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-tag-vocabulary/src/lib.rs:validate -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| compute | 函数 | 189–246 | 中等 | indexing、tag-vocabulary、worker | 0 | 由词表构建检索索引与层级展开结果，供标签导入时的候选匹配与自动归一使用。 |
| validate | 函数 | 57–187 | 复杂 | validation、tag-vocabulary、error-handling | 0 | 校验标签词表：检查层级引用、重复词条、正则与 facet 声明的合法性，返回结构化错误。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../synthesis-protocol/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs | Synthesis sidecar 的线缆协议定义：集中声明请求/响应 DTO、事件类型与版本字段，是 sidecar 与 Workbench 之间跨进程契约的唯一事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| compute | 函数 | 189–246 | 由词表构建检索索引与层级展开结果，供标签导入时的候选匹配与自动归一使用。 |
| validate | 函数 | 57–187 | 校验标签词表：检查层级引用、重复词条、正则与 facet 声明的合法性，返回结构化错误。 |
