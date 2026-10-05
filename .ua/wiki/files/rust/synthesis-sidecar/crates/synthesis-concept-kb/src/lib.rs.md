
# rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-concept-kb/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-concept-kb/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs -->

Synthesis sidecar 的概念知识库 crate 核心模块：维护概念条目的规范化表示、合并与查询能力，为标签导入和主题综合提供概念层数据。
源码：[rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs)

## 符号（10）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs:append_raw_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs:compute -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs:compute_index -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs:compute_query -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs:Concept -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs:ConceptPagedInputAssembler -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs:ConceptResult -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs:finish -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs:into_parts -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs:validate_source -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| append_raw_page | 函数 | 329–396 | 中等 | pagination、assembler、concept-model | 0 | 把一个原始分页结果页并入概念知识库分页装配器，累计条目数与边界信息并保留可回放的原始结构。 |
| compute | 函数 | 836–881 | 中等 | entry-point、worker、dispatch、concept-model | 0 | 概念知识库 worker 入口：解析请求 JSON、分派到索引或查询路径，并在检查点响应取消信号。 |
| compute_index | 函数 | 597–717 | 复杂 | indexing、inverted-index、search、concept-model | 0 | 由概念条目构建检索索引：归一化标签与别名、登记同义词并生成可供查询匹配的倒排结构。 |
| compute_query | 函数 | 719–819 | 复杂 | search、ranking、query、concept-model | 0 | 在概念索引上执行查询：匹配标签/别名/定义字段，按置信度与覆盖度排序并生成命中理由。 |
| Concept | 类 | 69–80 | 中等 | data-model、concept-model、domain-entity | 0 | 概念条目核心模型，承载标签、义项、来源与状态字段，是概念知识库的主实体。 |
| ConceptPagedInputAssembler | 类 | 261–327 | 中等 | assembler、pagination、integrity-check | 0 | 概念输入的分页装配器：逐页追加原始条目、累积计数并在 finish 时校验完整性，保证分页读不丢条目。 |
| ConceptResult | 类 | 510–541 | 中等 | data-model、query-result、contract | 0 | 概念查询结果模型，包含命中条目、分区与计数信息，是查询路径的返回契约。 |
| finish | 函数 | 398–440 | 中等 | pagination、finalization、concept-model | 0 | 结束分页装配：校验是否已收到末页，冻结累积条目并产出可写入的完整概念数据集。 |
| into_parts | 函数 | 544–574 | 中等 | serialization、query、concept-model | 0 | 将概念查询结果拆分为可序列化的分区结构，供协议层组装分页响应。 |
| validate_source | 函数 | 218–258 | 中等 | validation、concept-model、error-handling | 0 | 校验概念来源行记录的必填字段与证据完整性，缺失或不合法时返回带字段名的错误码。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](../../synthesis-protocol/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs | Synthesis sidecar 的线缆协议定义：集中声明请求/响应 DTO、事件类型与版本字段，是 sidecar 与 Workbench 之间跨进程契约的唯一事实源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| append_raw_page | 函数 | 329–396 | 把一个原始分页结果页并入概念知识库分页装配器，累计条目数与边界信息并保留可回放的原始结构。 |
| compute | 函数 | 836–881 | 概念知识库 worker 入口：解析请求 JSON、分派到索引或查询路径，并在检查点响应取消信号。 |
| compute_index | 函数 | 597–717 | 由概念条目构建检索索引：归一化标签与别名、登记同义词并生成可供查询匹配的倒排结构。 |
| compute_query | 函数 | 719–819 | 在概念索引上执行查询：匹配标签/别名/定义字段，按置信度与覆盖度排序并生成命中理由。 |
| finish | 函数 | 398–440 | 结束分页装配：校验是否已收到末页，冻结累积条目并产出可写入的完整概念数据集。 |
| into_parts | 函数 | 544–574 | 将概念查询结果拆分为可序列化的分区结构，供协议层组装分页响应。 |
| validate_source | 函数 | 218–258 | 校验概念来源行记录的必填字段与证据完整性，缺失或不合法时返回带字段名的错误码。 |
