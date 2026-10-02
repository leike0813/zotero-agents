
# rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-repository/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-repository/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs -->

标签、概念与主题三层图谱的仓储实现，提供分层邻接、边投影与分页读取供 Synthesis 工作台消费。
源码：[rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs)

## 符号（23）
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:ConceptRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:ConceptRelationRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:ConceptSenseRecord -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:load_concept_review_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:load_topic_graph_review_page -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:load_topic_graph_window -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:promote_concept_kb_index_with_receipt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:promote_tag_vocabulary_state -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:promote_topic_graph_index_with_receipt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:refresh_topic_discovery_projections -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:repair_tag_vocabulary_case_collisions -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:replace_concept_kb_application_state_with_receipt -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:replace_tag_candidate -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:replace_topic_graph_application_state_with_receipt -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:TagAliasRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:TagEffectRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:TagProtocolRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:TagVocabularyEntryRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:TagVocabularyReplacement -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:TopicGraphEdgeRecord -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:TopicGraphNodeRecord -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:update_topic_discovery_hint_outcome -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs:update_topic_discovery_hint_status -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| ConceptRecord | 类 | 168–182 | 中等 | 概念图谱、数据契约 | 0 | 概念记录，含规范名、定义来源与审阅状态。 |
| ConceptRelationRecord | 类 | 219–229 | 中等 | 概念图谱、关系边 | 0 | 概念关系记录，描述概念间的有向语义关联。 |
| ConceptSenseRecord | 类 | 186–201 | 中等 | 概念图谱、义项 | 0 | 概念义项记录，区分同一概念的多个语义。 |
| load_concept_review_page | 函数 | 977–1035 | 复杂 | 概念图谱、分页读取、审阅 | 0 | 分页加载概念审阅项，供 Synthesis 工作台的审阅界面使用。 |
| load_topic_graph_review_page | 函数 | 1184–1264 | 复杂 | 主题图谱、分页读取、审阅 | 0 | 分页加载主题图谱审阅项，附带节点与边的审阅状态。 |
| load_topic_graph_window | 函数 | 1266–1329 | 复杂 | 主题图谱、窗口读取、邻域 | 0 | 读取主题图谱的窗口视图，为可视化提供有界邻域数据。 |
| promote_concept_kb_index_with_receipt | 函数 | 1129–1155 | 中等 | 概念图谱、索引、提升 | 0 | 提升概念知识库索引并返回 promotion 回执。 |
| promote_tag_vocabulary_state | 函数 | 764–792 | 中等 | 标签词表、提升、basis | 0 | 将 staging 词表状态提升为 current，并同步 vocabulary basis。 |
| promote_topic_graph_index_with_receipt | 函数 | 1401–1427 | 中等 | 主题图谱、索引、提升 | 0 | 提升主题图谱索引并返回 promotion 回执。 |
| refresh_topic_discovery_projections | 函数 | 465–642 | 复杂 | 主题发现、投影重建、事务 | 0 | 重建主题发现相关投影，把提示状态同步到概念与主题图谱视图。 |
| repair_tag_vocabulary_case_collisions | 函数 | 794–826 | 中等 | 标签词表、修复、一致性 | 0 | 修复词表中因大小写折叠产生的条目冲突。 |
| replace_concept_kb_application_state_with_receipt | 函数 | 1056–1111 | 复杂 | 概念图谱、事务、提交证据 | 0 | 在同一事务内替换概念知识库应用状态并返回写入回执。 |
| replace_tag_candidate | 函数 | 1474–1507 | 中等 | 标签词表、候选、写入 | 0 | 替换单条标签候选记录，写入最新提议及其证据。 |
| replace_topic_graph_application_state_with_receipt | 函数 | 1343–1383 | 中等 | 主题图谱、事务、提交证据 | 0 | 替换主题图谱应用状态并在同一事务内提交回执。 |
| TagAliasRecord | 类 | 40–45 | 简单 | 标签词表、别名 | 0 | 标签别名记录，把原始写法映射到规范词表条目。 |
| TagEffectRecord | 类 | 104–116 | 中等 | 标签效果、数据契约 | 0 | 标签应用效果记录，描述某标签对文献集合的具体影响。 |
| TagProtocolRecord | 类 | 58–65 | 简单 | 标签词表、治理 | 0 | 标签协议记录，声明受控词表的治理约定。 |
| TagVocabularyEntryRecord | 类 | 23–36 | 中等 | 标签词表、数据契约 | 0 | 标签词表条目记录，含规范名、大小写折叠键与状态。 |
| TagVocabularyReplacement | 类 | 129–141 | 中等 | 标签词表、替换、数据契约 | 0 | 标签词表整体替换载荷，提交完整词表快照与 basis。 |
| TopicGraphEdgeRecord | 类 | 315–326 | 中等 | 主题图谱、边 | 0 | 主题图谱边记录，描述主题之间的邻接与权重。 |
| TopicGraphNodeRecord | 类 | 296–311 | 中等 | 主题图谱、节点、数据契约 | 0 | 主题图谱节点记录，承载主题的显示属性与图布局信息。 |
| update_topic_discovery_hint_outcome | 函数 | 402–463 | 中等 | 主题发现、状态机 | 0 | 记录主题发现提示的终态结果与失败原因。 |
| update_topic_discovery_hint_status | 函数 | 358–400 | 中等 | 主题发现、状态机 | 0 | 更新主题发现提示的处理状态，作为异步发现的进度信号。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [lib.rs](lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs | synthesis-repository crate 的 crate root，统一导出仓储端口、事务辅助与各领域仓储实现模块。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| ConceptRecord | 类 | 168–182 | 概念记录，含规范名、定义来源与审阅状态。 |
| ConceptRelationRecord | 类 | 219–229 | 概念关系记录，描述概念间的有向语义关联。 |
| ConceptSenseRecord | 类 | 186–201 | 概念义项记录，区分同一概念的多个语义。 |
| load_concept_review_page | 函数 | 977–1035 | 分页加载概念审阅项，供 Synthesis 工作台的审阅界面使用。 |
| load_topic_graph_review_page | 函数 | 1184–1264 | 分页加载主题图谱审阅项，附带节点与边的审阅状态。 |
| load_topic_graph_window | 函数 | 1266–1329 | 读取主题图谱的窗口视图，为可视化提供有界邻域数据。 |
| promote_concept_kb_index_with_receipt | 函数 | 1129–1155 | 提升概念知识库索引并返回 promotion 回执。 |
| promote_tag_vocabulary_state | 函数 | 764–792 | 将 staging 词表状态提升为 current，并同步 vocabulary basis。 |
| promote_topic_graph_index_with_receipt | 函数 | 1401–1427 | 提升主题图谱索引并返回 promotion 回执。 |
| refresh_topic_discovery_projections | 函数 | 465–642 | 重建主题发现相关投影，把提示状态同步到概念与主题图谱视图。 |
| repair_tag_vocabulary_case_collisions | 函数 | 794–826 | 修复词表中因大小写折叠产生的条目冲突。 |
| replace_concept_kb_application_state_with_receipt | 函数 | 1056–1111 | 在同一事务内替换概念知识库应用状态并返回写入回执。 |
| replace_tag_candidate | 函数 | 1474–1507 | 替换单条标签候选记录，写入最新提议及其证据。 |
| replace_topic_graph_application_state_with_receipt | 函数 | 1343–1383 | 替换主题图谱应用状态并在同一事务内提交回执。 |
| TagAliasRecord | 类 | 40–45 | 标签别名记录，把原始写法映射到规范词表条目。 |
| TagEffectRecord | 类 | 104–116 | 标签应用效果记录，描述某标签对文献集合的具体影响。 |
| TagProtocolRecord | 类 | 58–65 | 标签协议记录，声明受控词表的治理约定。 |
| TagVocabularyEntryRecord | 类 | 23–36 | 标签词表条目记录，含规范名、大小写折叠键与状态。 |
| TagVocabularyReplacement | 类 | 129–141 | 标签词表整体替换载荷，提交完整词表快照与 basis。 |
| TopicGraphEdgeRecord | 类 | 315–326 | 主题图谱边记录，描述主题之间的邻接与权重。 |
| TopicGraphNodeRecord | 类 | 296–311 | 主题图谱节点记录，承载主题的显示属性与图布局信息。 |
| update_topic_discovery_hint_outcome | 函数 | 402–463 | 记录主题发现提示的终态结果与失败原因。 |
| update_topic_discovery_hint_status | 函数 | 358–400 | 更新主题发现提示的处理状态，作为异步发现的进度信号。 |
