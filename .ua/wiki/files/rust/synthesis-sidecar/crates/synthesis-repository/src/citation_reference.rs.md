
# rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-repository/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-repository/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs -->

Citation Graph 的核心持久化实现，负责 Reference 节点、引用边、游标与分页读取等仓储操作。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs)

## 符号（28）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:apply_reference_review_transitions_with_receipt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:citation_graph_window_cte -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:CitationComplexMetricsRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:CitationEdgeRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:CitationLayoutRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:CitationLightMetricsRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:CitationMetricsPageQuery -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:CitationNodeRecord -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:commit_citation_graph_promotion -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:mark_reference_projection_caches_stale -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:normalize_imported_reference_redirect_graph -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:persist_redirect_graph -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:promote_citation_complex_metrics -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:promote_reference_matching -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:read_citation_graph_explicit -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:read_citation_graph_neighborhood -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:read_citation_graph_node_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:read_citation_graph_window -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:read_citation_layout_window -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:read_citation_metrics_page -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:ReferenceMatchProposalRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:ReferenceProjectionReplacement -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:ReferenceProjectionScope -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:ReferenceRedirectFactRecord -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:replace_citation_graph_application_state -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:replace_citation_graph_source_slice -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:replace_reference_projection -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs:upsert_canonical_reference_record -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| apply_reference_review_transitions_with_receipt | 函数 | 2400–2504 | 复杂 | reference、审阅、提交证据 | 0 | 在事务内应用人工审阅的状态流转并返回写入回执。 |
| citation_graph_window_cte | 函数 | 2775–2967 | 复杂 | citation-graph、sql、复用 | 0 | 构造引用图谱窗口查询的公共 CTE，供多个窗口读取变体复用。 |
| CitationComplexMetricsRecord | 类 | 117–145 | 中等 | citation-graph、指标、计算 | 0 | 复杂引用指标记录，包含 PageRank 类计算结果与 layout identity。 |
| CitationEdgeRecord | 类 | 46–57 | 简单 | citation-graph、边、数据契约 | 0 | 引用图谱边记录，描述 source/target 引用关系及其来源归属。 |
| CitationLayoutRecord | 类 | 149–159 | 中等 | citation-graph、布局 | 0 | 引用图谱布局记录，保存节点坐标与布局版本。 |
| CitationLightMetricsRecord | 类 | 103–113 | 中等 | citation-graph、指标 | 0 | 轻量引用指标记录，提供进出度等无需完整计算的度量。 |
| CitationMetricsPageQuery | 类 | 171–176 | 简单 | citation-graph、分页读取、查询参数 | 0 | 引用指标分页查询参数，含排序方式与游标。 |
| CitationNodeRecord | 类 | 33–42 | 简单 | citation-graph、节点、数据契约 | 0 | 引用图谱节点记录，承载单个文献节点的图属性与 basis。 |
| commit_citation_graph_promotion | 函数 | 1825–1878 | 复杂 | citation-graph、提升、事务 | 0 | 提交 rebuild attempt 的 promotion 结果，合并终态证据后收敛 attempt。 |
| mark_reference_projection_caches_stale | 函数 | 2614–2640 | 中等 | 缓存失效、reference、一致性 | 0 | 把受影响的 Reference 投影缓存标记为 stale，触发后续重算。 |
| normalize_imported_reference_redirect_graph | 函数 | 2506–2611 | 复杂 | reference、identity-mapping、规范化 | 0 | 规范化导入产生的重定向图，消解环并确定 canonical 根节点。 |
| persist_redirect_graph | 函数 | 3411–3474 | 复杂 | identity-mapping、持久化、事务 | 0 | 把内存中的重定向图整体持久化到 reference redirect 表族。 |
| promote_citation_complex_metrics | 函数 | 1880–1908 | 中等 | citation-graph、指标、提升 | 0 | 将复杂引用指标提升为 current，并更新 layout identity。 |
| promote_reference_matching | 函数 | 2328–2384 | 复杂 | reference、匹配、提升 | 0 | 提升 Reference 匹配结果：应用 winning proposal 并写入 binding 事实。 |
| read_citation_graph_explicit | 函数 | 919–967 | 复杂 | citation-graph、读取 | 0 | 读取显式声明的引用图谱范围，不做推断补全。 |
| read_citation_graph_neighborhood | 函数 | 859–917 | 复杂 | citation-graph、邻域、basis | 0 | 读取指定节点的邻域视图，basis 不匹配即 basis_mismatch 失败。 |
| read_citation_graph_node_page | 函数 | 969–1005 | 中等 | citation-graph、分页读取 | 0 | 分页读取引用图谱节点，供工作台分页浏览使用。 |
| read_citation_graph_window | 函数 | 743–857 | 复杂 | citation-graph、窗口读取、basis | 0 | 读取引用图谱窗口视图，绑定 basis 后开启短 reader transaction 返回有界节点子集。 |
| read_citation_layout_window | 函数 | 1203–1262 | 复杂 | citation-graph、布局、窗口读取 | 0 | 读取布局窗口，校验 layout identity 后返回可视范围内的节点坐标。 |
| read_citation_metrics_page | 函数 | 1112–1184 | 复杂 | citation-graph、指标、分页读取 | 0 | 分页读取引用指标，按 metrics sort 与 cursor 组织结果。 |
| ReferenceMatchProposalRecord | 类 | 372–390 | 中等 | reference、匹配、数据契约 | 0 | Reference 匹配提案记录，保存候选配对与判定依据。 |
| ReferenceProjectionReplacement | 类 | 339–355 | 中等 | reference、投影、替换 | 0 | Reference 投影整体替换载荷，提交新的 projection snapshot 与 basis。 |
| ReferenceProjectionScope | 类 | 331–335 | 简单 | reference、投影、数据契约 | 0 | Reference 投影的替换范围，界定受影响的文献集合。 |
| ReferenceRedirectFactRecord | 类 | 423–430 | 简单 | reference、identity-mapping、数据契约 | 0 | Reference 重定向事实记录，描述旧 identity 到 canonical 的映射。 |
| replace_citation_graph_application_state | 函数 | 1591–1658 | 复杂 | citation-graph、事务、状态 | 0 | 替换引用图谱的应用状态行，作为 rebuild 的状态提交点。 |
| replace_citation_graph_source_slice | 函数 | 1663–1821 | 复杂 | citation-graph、事务、切片替换 | 0 | 替换引用图谱的 source slice，在同一事务内提交 graph rows 与 state。 |
| replace_reference_projection | 函数 | 1934–2075 | 复杂 | reference、投影、事务 | 0 | 按 scope 替换 Reference 投影，原子提交 snapshot 与 basis。 |
| upsert_canonical_reference_record | 函数 | 1533–1563 | 中等 | reference、写入、identity | 0 | 写入或更新 canonical reference 记录，绑定 identity 与 revision。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs | synthesis-repository crate 的 crate root，统一导出仓储端口、事务辅助与各领域仓储实现模块。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| apply_reference_review_transitions_with_receipt | 函数 | 2400–2504 | 在事务内应用人工审阅的状态流转并返回写入回执。 |
| citation_graph_window_cte | 函数 | 2775–2967 | 构造引用图谱窗口查询的公共 CTE，供多个窗口读取变体复用。 |
| CitationComplexMetricsRecord | 类 | 117–145 | 复杂引用指标记录，包含 PageRank 类计算结果与 layout identity。 |
| CitationEdgeRecord | 类 | 46–57 | 引用图谱边记录，描述 source/target 引用关系及其来源归属。 |
| CitationLayoutRecord | 类 | 149–159 | 引用图谱布局记录，保存节点坐标与布局版本。 |
| CitationLightMetricsRecord | 类 | 103–113 | 轻量引用指标记录，提供进出度等无需完整计算的度量。 |
| CitationMetricsPageQuery | 类 | 171–176 | 引用指标分页查询参数，含排序方式与游标。 |
| CitationNodeRecord | 类 | 33–42 | 引用图谱节点记录，承载单个文献节点的图属性与 basis。 |
| commit_citation_graph_promotion | 函数 | 1825–1878 | 提交 rebuild attempt 的 promotion 结果，合并终态证据后收敛 attempt。 |
| mark_reference_projection_caches_stale | 函数 | 2614–2640 | 把受影响的 Reference 投影缓存标记为 stale，触发后续重算。 |
| normalize_imported_reference_redirect_graph | 函数 | 2506–2611 | 规范化导入产生的重定向图，消解环并确定 canonical 根节点。 |
| persist_redirect_graph | 函数 | 3411–3474 | 把内存中的重定向图整体持久化到 reference redirect 表族。 |
| promote_citation_complex_metrics | 函数 | 1880–1908 | 将复杂引用指标提升为 current，并更新 layout identity。 |
| promote_reference_matching | 函数 | 2328–2384 | 提升 Reference 匹配结果：应用 winning proposal 并写入 binding 事实。 |
| read_citation_graph_explicit | 函数 | 919–967 | 读取显式声明的引用图谱范围，不做推断补全。 |
| read_citation_graph_neighborhood | 函数 | 859–917 | 读取指定节点的邻域视图，basis 不匹配即 basis_mismatch 失败。 |
| read_citation_graph_node_page | 函数 | 969–1005 | 分页读取引用图谱节点，供工作台分页浏览使用。 |
| read_citation_graph_window | 函数 | 743–857 | 读取引用图谱窗口视图，绑定 basis 后开启短 reader transaction 返回有界节点子集。 |
| read_citation_layout_window | 函数 | 1203–1262 | 读取布局窗口，校验 layout identity 后返回可视范围内的节点坐标。 |
| read_citation_metrics_page | 函数 | 1112–1184 | 分页读取引用指标，按 metrics sort 与 cursor 组织结果。 |
| ReferenceMatchProposalRecord | 类 | 372–390 | Reference 匹配提案记录，保存候选配对与判定依据。 |
| ReferenceProjectionReplacement | 类 | 339–355 | Reference 投影整体替换载荷，提交新的 projection snapshot 与 basis。 |
| ReferenceProjectionScope | 类 | 331–335 | Reference 投影的替换范围，界定受影响的文献集合。 |
| ReferenceRedirectFactRecord | 类 | 423–430 | Reference 重定向事实记录，描述旧 identity 到 canonical 的映射。 |
| replace_citation_graph_application_state | 函数 | 1591–1658 | 替换引用图谱的应用状态行，作为 rebuild 的状态提交点。 |
| replace_citation_graph_source_slice | 函数 | 1663–1821 | 替换引用图谱的 source slice，在同一事务内提交 graph rows 与 state。 |
| replace_reference_projection | 函数 | 1934–2075 | 按 scope 替换 Reference 投影，原子提交 snapshot 与 basis。 |
| upsert_canonical_reference_record | 函数 | 1533–1563 | 写入或更新 canonical reference 记录，绑定 identity 与 revision。 |
