
# rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/rebuild.rs
所属分层：[Synthesis 领域与侧车](../../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph](../../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/rebuild.rs -->

Citation Graph 应用层的重建调度模块，创建私有 rebuild attempt 并在成功、失败或 basis mismatch 时收敛。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/rebuild.rs](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/rebuild.rs)

## 符号（3）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/rebuild.rs:CitationGraphCollectionPlan -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/rebuild.rs:CitationGraphRebuildAttempt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/rebuild.rs:plan -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CitationGraphCollectionPlan | 类 | 15–18 | 简单 | citation-graph、类型定义、basis | 1 | 重建采集计划，声明 Full/Incremental 模式与期望的图谱哈希，用于 basis 校验。 |
| CitationGraphRebuildAttempt | 类 | 38–43 | 简单 | citation-graph、attempt、生命周期、类型定义 | 0 | 不透明的引用图谱重建 attempt，持有 operation id、起始时间、采集计划与取消标志。 |
| plan | 函数 | 46–48 | 简单 | 访问器、citation-graph | 0 | 返回 attempt 持有的采集计划只读引用。 |
