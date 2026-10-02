
# rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-repository/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-repository/src.md)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql -->

Synthesis sidecar 的 SQLite 库表结构：定义引用图谱、主题图谱、concept 与维护操作等核心表的列、外键与索引。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_citation_edge -->

引用图谱边表：以 source/reference_instance 唯一约束记录文献间引用边及其绑定状态与角色。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_citation_graph_application_state -->

引用图谱单行应用状态：保存 graph/input/metrics 三个 hash 与节点边计数，作为 read view basis。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_citation_incoming_group -->

反向引用分组表：按目标文献聚合所有入边，为邻域查询提供有界读取。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_citation_layout_state -->

图谱布局状态表：按 view_key + preset 缓存 force 布局结果与诊断。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_citation_metrics_complex -->

复杂节点指标表：PageRank、连通分量、foundation/frontier 评分及各类归一化维度。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_citation_metrics_light -->

轻量节点指标表：仅保存出入度与匹配/未决引用计数，供快速列表与筛选使用。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_citation_node -->

引用图谱节点表：每条库内文献一行，保存标题、年份、作者、摘要与 Zotero 绑定状态。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_concept -->

概念主表：标签、别名、类型、领域、状态与定义字段，概念知识库的核心实体。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_concept_alias -->

概念别名表：保存归一化别名到概念/义项的映射与置信度。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_concept_application_state -->

概念层单行应用状态：manifest/index hash 与 index_stale 标志，驱动索引重建。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_concept_relation -->

概念关系表：记录概念间有向关系及其状态、置信度与来源证据。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_concept_review_item -->

概念审阅队列表：待人工确认的概念提案，带 topic 归属、候选与处理状态。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_concept_sense -->

概念义项表：多义消歧所需的义项级定义、领域、区分说明与证据。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_library_snapshot_item -->

文献库快照条目表：按 generation 保存条目快照，支撑分代同步与回滚。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_operation -->

公共维护操作表：operation 生命周期、phase、进度计数、basis 与诊断的持久化记录。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_reference_application_state -->

参考文献层单行应用状态：reference/input hash 与各级 ready 标志。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_reference_binding -->

文献绑定表：canonical 文献到 Zotero library item 的绑定记录与 basis hash。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_reference_canonical -->

规范化参考文献表：去重后的 canonical 文献记录，含标题、年份、作者、标识符与状态。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_reference_match_proposal -->

匹配提案表：待审阅的合并/绑定建议，保存得分、理由、证据与 basis。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_reference_raw -->

原始参考文献表：保留从正文抽取的每条原始引用及其解析结果与 canonical 归属。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_review_item -->

通用审阅队列表：以 review_kind 区分类型的待审阅项，支持阻塞依赖关系。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_schema_meta -->

库结构元数据表：以 key/value 记录 schema 版本等元信息。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_tag_alias -->

标签别名表：把用户标签映射到规范标签。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_tag_audit_active -->

标签审计活动批次表：当前生效的审计 run 及其状态。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_tag_staged_suggestion -->

标签暂存建议表：审计产出的待确认标签修改建议。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_tag_vocabulary_entry -->

标签词条表：受控词表条目及其 facet、层级与状态。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_topic_application_state -->

主题层单行应用状态：projection hash 与 revision，驱动 Workbench 投影重建。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_topic_graph_edge -->

主题图谱边表：主题间有向边及关系类型与状态。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)
<!-- node: table:rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql:synt_topic_graph_node -->

主题图谱节点表：主题节点、类型、定义与时间信息。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/schema.sql)

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [Cargo.toml](../Cargo.toml.md) | rust/synthesis-sidecar/crates/synthesis-repository/Cargo.toml | synthesis-repository crate 的 Cargo 清单，声明 SQLite 存储 crate 及其迁移相关依赖。 |
| [lib.rs](../../synthesis-concept-kb/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs | Synthesis sidecar 的概念知识库 crate 核心模块：维护概念条目的规范化表示、合并与查询能力，为标签导入和主题综合提供概念层数据。 |
| [lib.rs](../../synthesis-metrics/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-metrics/src/lib.rs | 指标计算 crate：对引用图谱、主题图谱等结构化产物计算覆盖率、分布等统计指标，供 Dashboard 与 Workbench 展示。 |
| [lib.rs](../../synthesis-reference-matcher/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs | 参考文献匹配算法 crate：把正文中抽取的引用片段归一化并对齐到文献库条目，产出可写入的 References/Citation 事实。 |
| [lib.rs](../../synthesis-tag-vocabulary/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-tag-vocabulary/src/lib.rs | 标签词表 crate：定义受控标签集合、层级关系与标签归一化规则，供标签导入与综合层校验使用。 |
| [lib.rs](../../synthesis-topic-graph/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-topic-graph/src/lib.rs | 主题图谱 crate：定义主题节点与边、图谱布局身份以及基于主题图谱的邻域与分页读取结构。 |
| [lib.rs](../../synthesis-topic-structured-artifact/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs | 主题结构化产物 crate：定义主题综合输出的结构化 artifact 模型、解析与校验规则，是 Workbench 读取综合结果的数据契约。 |
