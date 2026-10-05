
# rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-application/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-application/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs -->

维护文献侧 canonical artifact（规范化附件、Digest、引用分析产物）的领域模型与投影规则，保证同一文献在多处消费时看到一致事实。
源码：[rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs)

## 符号（8）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs:CitationAnalysisArtifact -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs:CitationTimeline -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs:LiteratureScoreArtifact -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs:parse_citation_analysis_artifact -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs:parse_literature_score_artifact -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs:SourceReferenceArtifact -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs:validate_citation_against_references -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs:validate_source_artifact -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| CitationAnalysisArtifact | 类 | 216–223 | 简单 | rust、A、r、t | 0 | 引用分析 artifact：承载引用功能判定、元信息、引用范围决策与时间线分布。 |
| CitationTimeline | 类 | 264–268 | 简单 | rust | 0 | 引用时间线：按时间桶聚合被引与施引分布，支撑文献影响力演进展示。 |
| LiteratureScoreArtifact | 类 | 74–83 | 简单 | rust、A、r、t | 0 | 文献评分 artifact：按维度与判定标准组织评分证据，形成可解释的评分结论。 |
| parse_citation_analysis_artifact | 函数 | 362–401 | 中等 | rust、解析、artifact、引用分析 | 0 | 解析引用分析 artifact，将引用功能、元信息与时间线聚合成规范结构。 |
| parse_literature_score_artifact | 函数 | 124–184 | 中等 | rust、解析、校验、artifact | 0 | 解析并校验文献评分 artifact 结构，任何缺字段或维度不一致都返回失败而不做部分接受。 |
| SourceReferenceArtifact | 类 | 17–20 | 简单 | rust、A、r、t | 0 | 来源文献 artifact 根类型，聚合书目信息、匹配结论与评分维度。 |
| validate_citation_against_references | 函数 | 403–445 | 中等 | rust、校验、一致性、引用分析 | 0 | 交叉校验引用条目与已确认文献集合，标记无法解析的引用而不静默丢弃。 |
| validate_source_artifact | 函数 | 326–354 | 简单 | rust、校验、artifact、文献 | 0 | 校验来源文献 artifact 的书目字段完整性与匹配证据，失败时给出可定位诊断。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs | synthesis-application crate 根模块：声明各领域子模块并对外 re-export 应用层入口，界定应用层与 repository/engine 的边界。 |
| [reference_application.rs](reference_application.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs | Reference 应用层最大模块：编排文献身份匹配、刷新、canonical artifact 落地与跨域投影，是文献写入路径的编排中枢。 |
| [reference_refresh.rs](reference_refresh.rs.md) | rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs | 文献刷新流程：从 canonical artifact 与 Host facts 重建文献派生视图与健康状态，保证刷新幂等且不重复产生宿主副作用。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| CitationAnalysisArtifact | 类 | 216–223 | 引用分析 artifact：承载引用功能判定、元信息、引用范围决策与时间线分布。 |
| CitationTimeline | 类 | 264–268 | 引用时间线：按时间桶聚合被引与施引分布，支撑文献影响力演进展示。 |
| LiteratureScoreArtifact | 类 | 74–83 | 文献评分 artifact：按维度与判定标准组织评分证据，形成可解释的评分结论。 |
| SourceReferenceArtifact | 类 | 17–20 | 来源文献 artifact 根类型，聚合书目信息、匹配结论与评分维度。 |
