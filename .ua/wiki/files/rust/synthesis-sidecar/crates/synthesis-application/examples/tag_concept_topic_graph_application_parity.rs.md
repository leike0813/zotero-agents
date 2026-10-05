
# rust/synthesis-sidecar/crates/synthesis-application/examples/tag_concept_topic_graph_application_parity.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/examples](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/examples.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/examples/tag_concept_topic_graph_application_parity.rs -->

标签、概念、主题与图谱在应用层的 parity 示例测试，覆盖 taxonomy 域的读写与投影一致性。
源码：[rust/synthesis-sidecar/crates/synthesis-application/examples/tag_concept_topic_graph_application_parity.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/examples/tag_concept_topic_graph_application_parity.rs)

## 符号（4）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/tag_concept_topic_graph_application_parity.rs:main -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/tag_concept_topic_graph_application_parity.rs:resolve -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/tag_concept_topic_graph_application_parity.rs:tag_replacement -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/examples/tag_concept_topic_graph_application_parity.rs:validate -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 272–605 | 复杂 | test、parity、入口、契约语料、concept、topic-graph | 0 | parity 驱动主流程：驱动标签、概念与主题图谱请求，并验证故障路径与绑定失败行为。 |
| resolve | 函数 | 134–145 | 中等 | test、fake host、绑定解析 | 1 | 绑定解析测试替身，按预设映射把外部引用绑定到库内节点。 |
| tag_replacement | 函数 | 225–255 | 中等 | test、fixture、tag、替换语义 | 1 | 构造标签替换场景的输入与期望输出，验证 taxonomy 写入语义。 |
| validate | 函数 | 97–103 | 简单 | test、输入校验、tag | 1 | 校验标签 compute 收到的输入批次形状，不合法即失败。 |
